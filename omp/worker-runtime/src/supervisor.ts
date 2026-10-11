import * as fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { createHash, timingSafeEqual } from 'node:crypto';
import { RpcProcess } from './rpc.ts';
import { containedProfile, inspectModels, inspectSavedModel, type ModelSelection } from './profile.ts';
import { assistantResponse, operationalFrame, patchRequest, readRequest, recordMilestone, report, requestFile, trace } from './feedback.ts';
import { VERSION, MAX_FRAME, RuntimeError, invariant, manifestAt, atomicJson, jsonFile, object, text, integer, privateDir, Journal, readEvents, errorValue, modelRole, thinkingLevel, type Status } from './common.ts';

export async function supervise(dir: string) {
  process.umask(0o077);
  const manifest = manifestAt(dir);
  invariant(manifest.supervisorPid === undefined, 'OWNERSHIP_MISMATCH', 'Generation already has a supervisor; use explicit reconciled resume');
  const lockFile = path.join(dir, 'supervisor.lock');
  const lockFd = fs.openSync(lockFile, 'wx', 0o600);
  fs.writeFileSync(lockFd, JSON.stringify({ pid: process.pid, generation: manifest.generation }));
  fs.fsyncSync(lockFd); fs.closeSync(lockFd);
  manifest.supervisorPid = process.pid;
  atomicJson(path.join(dir, 'manifest.json'), manifest);
  const statusFile = path.join(dir, 'status.json');
  const old = fs.existsSync(statusFile) ? object(jsonFile(statusFile)) : {};
  const journal = new Journal(dir, typeof old.eventSeq === 'number' ? old.eventSeq : 0);
  const requestsDir = path.join(dir, 'requests'); privateDir(requestsDir);
  for (const file of fs.readdirSync(requestsDir)) {
    const full = path.join(requestsDir, file); const record = object(jsonFile(full));
    // Only explicit reconciled resume reaches here. Never invent an end timestamp.
    if (record.state === 'pending' || record.assignmentState === 'active') atomicJson(full, {
      ...record, state: record.state === 'pending' ? 'outcome-unknown' : record.state,
      assignmentState: record.assignmentState === 'active' ? 'outcome-unknown' : record.assignmentState,
      recoveryNote: 'Supervisor restarted; unobserved outcome, never replay automatically',
    });
  }
  const status: Status = { id: manifest.id, generation: manifest.generation, lifecycle: 'starting', activity: 'unknown', eventSeq: journal.seq, attentionSeq: typeof old.attentionSeq === 'number' ? old.attentionSeq : 0, updatedAt: new Date().toISOString(), heartbeatAt: new Date().toISOString() };
  let stopping: Promise<void> | undefined;
  let rpc: RpcProcess | undefined;
  let mutationBusy = false, suppressedUpdates = 0;
  const correlations = new Map<string, { requestId: string; assignmentRequestId?: string }>();
  const listeners = new Set<() => void>();
  const sockets = new Set<net.Socket>();
  function persist() {
    status.updatedAt = new Date().toISOString(); status.eventSeq = journal.seq;
    atomicJson(statusFile, status);
    for (const listener of [...listeners]) listener();
  }
  function patchAssignment(patch: Record<string, unknown>) {
    if (status.assignment) patchRequest(dir, status.assignment.requestId, { ...patch, suppressedUpdates });
  }
  function event(type: string, data: Record<string, unknown> = {}, attention = false, owner: string | undefined = status.assignment?.requestId) {
    const bytes = Buffer.byteLength(JSON.stringify(data));
    const bounded = bytes > 2048 ? { type: data.type, requestId: data.requestId, rpcId: data.rpcId, command: data.command, truncated: true, originalBytes: bytes } : data;
    const entry = journal.append(type, { ...bounded, ...(owner ? { assignmentRequestId: owner } : {}) });
    const ids = new Set([owner, typeof data.requestId === 'string' ? data.requestId : undefined]);
    for (const id of ids) if (id && fs.existsSync(requestFile(dir, id))) recordMilestone(dir, id, entry);
    if (attention) status.attentionSeq = entry.seq;
    status.lastEventAt = entry.at; persist();
    return entry;
  }
  function observeNative(value: unknown) {
    const state = object(value), model = object(state.model);
    const selector = text(model.provider) + '/' + text(model.id);
    status.model = selector;
    status.thinking = state.thinkingLevel === undefined ? undefined : thinkingLevel(state.thinkingLevel);
    status.sessionId = text(state.sessionId); status.sessionFile = text(state.sessionFile);
    if (selector !== manifest.model) { manifest.role = undefined; status.role = undefined; }
    manifest.model = selector; manifest.thinking = status.thinking;
    manifest.sessionId = status.sessionId; manifest.sessionFile = status.sessionFile;
    atomicJson(path.join(dir, 'manifest.json'), manifest);
    // A native get_state cannot clear a blocked extension approval or uncertain dispatch.
    if (status.activity !== 'dispatching' && status.activity !== 'blocked') status.activity = state.isStreaming === true || state.isCompacting === true || Number(state.queuedMessageCount || 0) > 0 ? 'running' : 'idle';
    persist(); return state;
  }
  function updateNative(value: unknown) {
    const expectedModel = manifest.model, expectedThinking = manifest.thinking;
    const state = observeNative(value);
    const matches = status.model === expectedModel && (expectedThinking === undefined || status.thinking === expectedThinking);
    if (!matches) {
      manifest.role = undefined; status.role = undefined;
      manifest.configurationUnknown = true; status.configurationUnknown = true;
      atomicJson(path.join(dir, 'manifest.json'), manifest);
      status.error = 'Native model/thinking drift requires reconciliation';
      event('configuration_drift', { model: status.model, thinking: status.thinking ?? null }, true);
    }
    invariant(status.model === expectedModel, 'MODEL_MISMATCH', `Expected ${expectedModel}, got ${status.model}`);
    invariant(expectedThinking === undefined || status.thinking === expectedThinking, 'THINKING_MISMATCH', `Expected ${expectedThinking}, got ${status.thinking}`);
    return state;
  }
  function requireIdle(state: Record<string, unknown>) {
    invariant(status.activity === 'idle' && state.isStreaming === false && state.isCompacting === false && state.queuedMessageCount === 0, 'BUSY', 'Configuration/prompt requires idle, non-compacting, unblocked work with no queued messages');
  }
  const server = net.createServer(socket => {
    if (sockets.size >= 64) { socket.destroy(); return; }
    sockets.add(socket); let buffer = Buffer.alloc(0), handled = false;
    socket.on('error', () => socket.destroy());
    socket.on('close', () => sockets.delete(socket));
    const inputTimer = setTimeout(() => { if (!handled) socket.destroy(); }, 5000);
    socket.on('close', () => clearTimeout(inputTimer));
    socket.on('data', async data => {
      if (handled) return;
      buffer = Buffer.concat([buffer, typeof data === 'string' ? Buffer.from(data) : data]);
      if (buffer.length > MAX_FRAME) { socket.destroy(); return; }
      const newline = buffer.indexOf(10); if (newline < 0) return;
      handled = true; clearTimeout(inputTimer);
      try {
        const request = object(JSON.parse(buffer.subarray(0, newline).toString()));
        const supplied = Buffer.from(text(request.token)); const expected = Buffer.from(manifest.token);
        invariant(supplied.length === expected.length && timingSafeEqual(supplied, expected) && request.generation === manifest.generation, 'STALE_GENERATION', 'Invalid token or stale worker generation');
        const result = await dispatch(text(request.command), object(request.args), socket);
        const encoded = JSON.stringify({ ok: true, result }) + '\n';
        invariant(Buffer.byteLength(encoded) <= MAX_FRAME, 'RESPONSE_TOO_LARGE', 'Request fewer records; response exceeds 1 MiB');
        if (!socket.destroyed) socket.end(encoded);
      } catch (error) { if (!socket.destroyed) socket.end(JSON.stringify({ ok: false, error: errorValue(error) }) + '\n'); }
    });
  });
  const serverReady = Promise.withResolvers<void>();
  server.once('error', serverReady.reject);
  if (fs.existsSync(manifest.socket)) fs.unlinkSync(manifest.socket);
  server.listen(manifest.socket, () => { fs.chmodSync(manifest.socket, 0o600); serverReady.resolve(); });
  await serverReady.promise;
  persist();
  const heartbeat = setInterval(() => {
    status.heartbeatAt = new Date().toISOString();
    if (status.assignment && ['active','outcome-unknown'].includes(status.assignment.state)) {
      const age = Date.now() - status.assignment.startedAt;
      if (manifest.checkpointMs > 0 && age >= manifest.checkpointMs && !status.assignment.checkpointDue) {
        status.assignment.checkpointDue = true; patchAssignment({}); event('checkpoint_due', {}, true);
      }
      if (manifest.softBudgetMs > 0 && age >= manifest.softBudgetMs && !status.assignment.softBudgetExceeded) {
        status.assignment.softBudgetExceeded = true; patchAssignment({}); event('soft_budget_exceeded', {}, true);
      }
      if (manifest.maxRuntimeMs > 0 && age >= manifest.maxRuntimeMs) void stop('hard-deadline');
    }
    persist();
  }, 250);
  function interrupt(reason: string, wasActive = false) {
    if (status.assignment && (wasActive || ['active','outcome-unknown'].includes(status.assignment.state))) {
      status.assignment.state = 'interrupted';
      // An interrupt request is not proof of native execution end. agent_end records that.
      patchAssignment({ assignmentState: 'interrupted', interruptedAt: new Date().toISOString() });
      event('interrupted', { reason }, true);
    }
  }
  async function stop(reason: string) {
    if (stopping) return stopping;
    stopping = (async () => {
      status.lifecycle = 'stopping'; event('stopping', { reason });
      interrupt(reason);
      try { if (rpc && rpc.exitCode === undefined) await rpc.request('abort', {}, 1500).catch(() => undefined); }
      finally { if (rpc) await rpc.terminate(); }
      status.lifecycle = reason === 'operator-stop' ? 'stopped' : ['startup-failed','worker-exited','protocol-error'].includes(reason) ? 'failed' : 'interrupted';
      status.activity = 'idle';
      event('stopped', { reason }, true); clearInterval(heartbeat);
      server.close();
      const cleanup = setTimeout(() => { for (const socket of sockets) socket.destroy(); }, 500);
      cleanup.unref();
      try { fs.unlinkSync(manifest.socket); } catch { /* Already removed. */ }
      try { fs.unlinkSync(lockFile); } catch { /* Already released. */ }
    })();
    return stopping;
  }
  function captureResponse(message: unknown) {
    const response = assistantResponse(message);
    if (response && status.assignment) patchAssignment({ finalResponse: response, evidence: { sessionFile: status.sessionFile ?? null, requestFile: requestFile(dir, status.assignment.requestId) } });
  }
  function nativeEvent(frame: Record<string, unknown>) {
    const data = operationalFrame(frame);
    if (!data) { suppressedUpdates++; return; }
    if (frame.type === 'response') {
      const correlation = typeof frame.id === 'string' ? correlations.get(frame.id) : undefined;
      if (!correlation) {
        // Ignore successful read/state dumps, but surface new native failures.
        if (frame.success === false) { status.error = String(data.error || 'Native command failed'); event('rpc_response', data, true); }
        return;
      }
      const record = readRequest(dir, correlation.requestId);
      if (frame.success === true && frame.id === record.rpcId && record.command !== 'configure') {
        patchRequest(dir, correlation.requestId, { acknowledgedAt: new Date().toISOString() });
      }
      event('rpc_response', { ...data, requestId: correlation.requestId }, frame.success === false, correlation.assignmentRequestId);
      return;
    }
    let attention = false;
    if (frame.type === 'agent_start' && !stopping) {
      status.activity = 'running';
      if (status.assignment) {
        if (status.assignment.state === 'turn-ended') status.assignment.state = 'active';
        const previous = readRequest(dir, status.assignment.requestId);
        patchAssignment({ startedAt: previous.startedAt ?? new Date().toISOString(), endedAt: null, assignmentState: status.assignment.state });
      }
    }
    if (frame.type === 'message_end') {
      captureResponse(frame.message);
      if (data.error || data.stopReason === 'error' || data.stopReason === 'aborted') {
        attention = true;
        if (data.error || data.stopReason === 'error') status.error = String(data.error || 'Native assistant error');
        if (data.stopReason === 'aborted') interrupt('native-aborted');
        patchAssignment({ ...(status.error ? { error: status.error } : {}) });
      }
    }
    if (frame.type === 'agent_end') {
      if (Array.isArray(frame.messages)) {
        for (const message of [...frame.messages].reverse()) {
          if (assistantResponse(message)) { captureResponse(message); break; }
        }
      }
      status.activity = 'idle'; attention = true;
      if (status.assignment && status.assignment.state !== 'turn-ended') {
        if (status.assignment.state === 'active') status.assignment.state = 'turn-ended';
        patchAssignment({ endedAt: new Date().toISOString(), assignmentState: status.assignment.state });
      }
    }
    if (frame.type === 'extension_ui_request') { status.activity = 'blocked'; attention = true; }
    if (frame.type === 'extension_error' || frame.type === 'error' || data.isError === true || data.error) {
      status.error = String(data.error || 'Native worker error'); attention = true; patchAssignment({ error: status.error });
    }
    event('rpc', data, attention);
  }
  async function dispatch(command: string, args: Record<string, unknown>, socket: net.Socket): Promise<unknown> {
    if (command === 'status') return status;
    if (command === 'events') return readEvents(dir, integer(args.after ?? 0), integer(args.limit ?? 100, 1, 200));
    if (command === 'request') return readRequest(dir, text(args.requestId));
    if (command === 'report') return report(dir, args.requestId === undefined ? undefined : text(args.requestId));
    if (command === 'trace') return trace(dir, text(args.requestId));
    if (command === 'wait') {
      const until = text(args.until); invariant(['idle','attention','exit'].includes(until), 'INVALID_WAIT', 'until must be idle, attention or exit');
      invariant(listeners.size < 32, 'QUEUE_FULL', 'Too many waiters');
      const timeout = integer(args.timeoutMs ?? 30000, 1, 3600000), after = integer(args.after ?? 0);
      const waiter = Promise.withResolvers<unknown>();
      const matches = () => until === 'exit' ? ['stopped','failed','interrupted'].includes(status.lifecycle)
        : until === 'idle' ? status.lifecycle === 'ready' && status.activity === 'idle'
        : (status.attentionSeq ?? 0) > after;
      const finish = (timedOut: boolean) => { clearTimeout(timer); listeners.delete(check); socket.off('close', cancel); waiter.resolve({ timedOut, cursor: Math.max(after, status.eventSeq), attentionSeq: status.attentionSeq ?? 0, status: structuredClone(status) }); };
      const check = () => { if (matches()) finish(false); };
      const cancel = () => finish(true);
      const timer = setTimeout(() => finish(true), timeout);
      socket.once('close', cancel); listeners.add(check); check(); return waiter.promise;
    }
    if (command === 'stop') { await stop('operator-stop'); return status; }
    invariant(status.lifecycle === 'ready' && rpc, 'NOT_READY', 'Worker is not ready');
    if (command === 'state') { updateNative(await rpc.request('get_state', {}, 10000)); return status; }
    const native: Record<string, string> = { prompt: 'prompt', steer: 'steer', 'follow-up': 'follow_up', abort: 'abort', configure: 'set_model' };
    invariant(Object.hasOwn(native, command), 'INVALID_COMMAND', 'Unsupported worker command');
    const requestId = text(args.requestId), file = requestFile(dir, requestId);
    const message = command === 'abort' || command === 'configure' ? undefined : text(args.message);
    invariant(!manifest.safeProbe || command === 'abort' || command === 'configure', 'PROBE_READ_ONLY', 'Safe-probe workers cannot receive inference-producing commands');
    invariant(!message || Buffer.byteLength(message) <= 128 * 1024, 'MESSAGE_TOO_LARGE', 'Assignment exceeds 128 KiB');
    const hasConfiguration = command === 'configure' || args.role !== undefined || args.thinking !== undefined;
    invariant(!hasConfiguration || command === 'configure' || command === 'prompt', 'INVALID_COMMAND', 'Only configure/prompt can select task settings');
    // Preserve the v0.1 hash for commands without configuration; dedup BEFORE reads/effects.
    const payload = { command, message, ...(hasConfiguration ? { configuration: { role: args.role, thinking: args.thinking } } : {}) };
    const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    if (fs.existsSync(file)) {
      const previous = readRequest(dir, requestId);
      invariant(previous.hash === hash, 'REQUEST_CONFLICT', 'Request ID already identifies a different command');
      return previous;
    }
    const requestedRole = args.role === undefined ? undefined : modelRole(args.role);
    const requestedThinking = args.thinking === undefined ? undefined : thinkingLevel(args.thinking);
    invariant(command !== 'configure' || requestedRole !== undefined, 'INVALID_ROLE', 'configure requires --role');
    invariant(fs.readdirSync(requestsDir).length < 1000, 'HISTORY_FULL', 'Command ledger is full; preserve history and use a new worker ID');
    invariant(!mutationBusy, 'BUSY', 'Another mutation is being dispatched');
    mutationBusy = true;
    try {
      let target: ModelSelection | undefined;
      if (command === 'prompt' || command === 'configure') {
        invariant(status.assignment?.state !== 'outcome-unknown', 'RECONCILIATION_REQUIRED', 'Inspect uncertain effects and explicitly stop/resume --reconciled before assigning new work');
        invariant(!manifest.configurationUnknown, 'RECONCILIATION_REQUIRED', 'Configuration outcome requires explicit stop/resume --reconciled');
        invariant(status.activity !== 'blocked', 'BUSY', 'Blocked sessions cannot be configured or assigned');
        requireIdle(updateNative(await rpc.request('get_state', {}, 10000)));
        containedProfile(manifest.plan, manifest.profile);
        target = requestedRole ? inspectModels(manifest.profile, requestedRole, manifest.executable, manifest.profileHash)
          : inspectSavedModel(manifest.profile, manifest.model, manifest.role, manifest.executable, manifest.profileHash);
      }
      if (command === 'follow-up') invariant(status.assignment?.state === 'active', 'NOT_RUNNING', 'follow-up requires active work; use prompt for an idle worker');
      const owner = command === 'prompt' || command === 'configure' ? requestId : status.assignment?.requestId;
      const intent = { feedbackVersion: 1, requestId, rpcId: `${manifest.generation}-${requestId}`, rpcIds: [] as string[], command, hash, generation: manifest.generation, at: new Date().toISOString(), state: 'pending', assignmentState: command === 'prompt' ? 'not-started' : undefined, configuration: hasConfiguration ? { role: requestedRole ?? manifest.role, thinking: requestedThinking ?? null } : undefined };
      atomicJson(file, intent); event('command_intent', { requestId, command }, false, owner);
      patchRequest(dir, requestId, { assignmentRequestId: owner ?? null });
      const timeout = integer(args.timeoutMs ?? 30000, 1, 120000);
      async function send(type: string, fields: Record<string, unknown>, suffix = '') {
        invariant(!stopping && status.lifecycle === 'ready' && rpc, 'NOT_READY', 'Worker stopped during dispatch');
        const rpcId = intent.rpcId + suffix;
        correlations.set(rpcId, { requestId, assignmentRequestId: owner });
        const record = readRequest(dir, requestId);
        patchRequest(dir, requestId, { rpcIds: [...(record.rpcIds as string[]), rpcId], ...(command === 'configure' && !record.sentAt ? { sentAt: new Date().toISOString() } : {}) });
        event('rpc_sent', { requestId, rpcId, command: type }, false, owner);
        return rpc.request(type, fields, timeout, rpcId);
      }
      let configurationAttempted = false;
      try {
        if (hasConfiguration && target) {
          configurationAttempted = true;
          const priorRole = manifest.role, priorModel = manifest.model;
          const expectedThinking = requestedThinking ?? manifest.thinking;
          manifest.configurationUnknown = true; status.configurationUnknown = true;
          atomicJson(path.join(dir, 'manifest.json'), manifest);
          patchRequest(dir, requestId, { configurationOutcome: 'outcome-unknown' });
          try {
            const slash = target.model.indexOf('/');
            await send('set_model', { provider: target.model.slice(0, slash), modelId: target.model.slice(slash + 1) }, command === 'configure' ? '' : ':model');
            if (expectedThinking !== undefined) await send('set_thinking_level', { level: expectedThinking }, ':thinking');
            const observed = await send('get_state', {}, ':verify');
            requireIdle(observeNative(observed));
            invariant(status.model === target.model, 'MODEL_MISMATCH', `Expected ${target.model}, got ${status.model}`);
            invariant(expectedThinking === undefined || status.thinking === expectedThinking, 'THINKING_MISMATCH', `Expected ${expectedThinking}, got ${status.thinking}; refusing clamping`);
            manifest.role = target.role; status.role = target.role;
            manifest.configurationUnknown = false; status.configurationUnknown = false;
            atomicJson(path.join(dir, 'manifest.json'), manifest);
            patchRequest(dir, requestId, { configurationOutcome: 'verified', role: manifest.role, model: manifest.model, thinking: manifest.thinking ?? null });
            event('configured', { requestId, role: manifest.role, model: manifest.model, thinking: manifest.thinking ?? null }, false, owner);
          } catch (error) {
            // A failed multi-command transaction is NOT a rollback. Read actual state,
            // but timeouts/transport failures may still have later native effects.
            let observed: unknown = null;
            try {
              const state = await send('get_state', {}, ':reconcile');
              observeNative(state);
              manifest.role = status.model === target.model ? target.role : status.model === priorModel ? priorRole : undefined;
              status.role = manifest.role;
              observed = { model: status.model, role: status.role ?? null, thinking: status.thinking ?? null };
            } catch { /* Outcome remains unknown; last confirmed settings are not rollback. */ }
            manifest.configurationUnknown = true; status.configurationUnknown = true;
            atomicJson(path.join(dir, 'manifest.json'), manifest);
            patchRequest(dir, requestId, { configurationOutcome: observed ? 'partial-observed' : 'outcome-unknown', observedConfiguration: observed, role: observed ? manifest.role ?? null : null, model: observed ? manifest.model : null, thinking: observed ? manifest.thinking ?? null : null });
            throw error;
          }
        }
        if (command === 'configure') {
          patchRequest(dir, requestId, { state: 'acknowledged', acknowledgedAt: new Date().toISOString() });
          event('command_acknowledged', { requestId, command }, false, owner);
          return readRequest(dir, requestId);
        }
        if (command === 'prompt') {
          status.activity = 'dispatching'; status.error = undefined; suppressedUpdates = 0;
          status.assignment = { requestId, startedAt: Date.now(), state: 'active', checkpointDue: false, softBudgetExceeded: false };
          patchRequest(dir, requestId, { assignmentState: 'active', role: manifest.role ?? target?.role ?? null, model: manifest.model, thinking: manifest.thinking ?? null, evidence: { sessionFile: status.sessionFile ?? null, requestFile: file } });
          persist();
        }
        patchRequest(dir, requestId, { sentAt: new Date().toISOString() });
        const abortingActive = command === 'abort' && !!status.assignment && ['active','outcome-unknown'].includes(status.assignment.state);
        const response = await send(native[command]!, message === undefined ? {} : { message });
        if (command === 'prompt' && status.activity === 'dispatching') {
          if (response && typeof response === 'object' && 'agentInvoked' in response && response.agentInvoked === false) {
            status.activity = 'idle';
            if (status.assignment) status.assignment.state = 'turn-ended';
            patchAssignment({ assignmentState: 'turn-ended', noAgentInvoked: true });
            event('no_agent_invoked', { requestId }, true);
          } else status.activity = 'running';
        }
        if (abortingActive) interrupt('operator-abort', true);
        // Native acknowledgments are control metadata, not a transcript/state dump.
        patchRequest(dir, requestId, { state: 'acknowledged', acknowledgedAt: readRequest(dir, requestId).acknowledgedAt ?? new Date().toISOString(), response: { received: true } });
        event('command_acknowledged', { requestId, command }, false, owner);
        if (command === 'abort') updateNative(await rpc.request('get_state', {}, 5000));
        return readRequest(dir, requestId);
      } catch (error) {
        const rejected = error instanceof RuntimeError && error.code === 'RPC_REJECTED';
        const failure = { code: errorValue(error).code, message: errorValue(error).message.slice(0, 2000), truncated: errorValue(error).message.length > 2000 };
        patchRequest(dir, requestId, { state: rejected && !configurationAttempted ? 'rejected' : 'outcome-unknown', error: failure });
        status.error = failure.message;
        if (command === 'prompt' && status.assignment?.requestId === requestId) {
          status.assignment.state = 'outcome-unknown'; status.activity = 'blocked'; patchAssignment({ assignmentState: 'outcome-unknown' });
        }
        event('command_failed', { requestId, command, error: failure.message }, true, owner);
        return readRequest(dir, requestId);
      }
    } finally { mutationBusy = false; }
  }
  process.once('SIGTERM', () => void stop('supervisor-signal'));
  process.once('SIGINT', () => void stop('supervisor-signal'));
  try {
    if (stopping) { await stopping; return; }
    containedProfile(manifest.plan, manifest.profile);
    const selected = inspectSavedModel(manifest.profile, manifest.model, manifest.role, manifest.executable, manifest.profileHash);
    manifest.role = selected.role; status.role = selected.role;
    const args = ['--mode','rpc','--no-ui','--cwd',manifest.repo,'--config',manifest.profile,'--model',manifest.model,'--no-prewalk','--session-dir',path.join(dir,'sessions')];
    if (manifest.resumeFile) args.push('--resume', manifest.resumeFile);
    if (manifest.safeProbe) args.push('--no-extensions','--no-skills','--no-rules','--no-lsp','--no-tools');
    rpc = new RpcProcess(manifest.executable, args, {
      cwd: manifest.repo, onEvent: nativeEvent,
      onError: error => { status.error = errorValue(error).message; patchAssignment({ error: status.error }); event('protocol_error', { error: status.error }, true); void stop('protocol-error'); },
      onStderr: data => {
        const file = path.join(dir,'stderr.log');
        if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) fs.renameSync(file,file+'.1');
        fs.appendFileSync(file,data,{mode:0o600});
      },
      onExit: code => {
        status.exitCode = code;
        if (!stopping) {
          status.error = 'Native worker process group exited unexpectedly';
          if (status.assignment?.state === 'active') { status.assignment.state = 'outcome-unknown'; patchAssignment({ assignmentState: 'outcome-unknown', error: status.error }); }
          event('worker_exited', { code }, true); void stop('worker-exited');
        }
      },
    });
    manifest.workerPid = rpc.child.pid; atomicJson(path.join(dir,'manifest.json'),manifest);
    const slash = manifest.model.indexOf('/');
    await rpc.request('get_state', {}, 30000);
    if (stopping) { await stopping; return; }
    await rpc.request('set_model', { provider: manifest.model.slice(0,slash), modelId: manifest.model.slice(slash+1) }, 30000);
    if (stopping) { await stopping; return; }
    if (manifest.thinking !== undefined) await rpc.request('set_thinking_level', { level: manifest.thinking }, 10000);
    if (stopping) { await stopping; return; }
    updateNative(await rpc.request('get_state', {}, 10000));
    if (stopping) { await stopping; return; }
    manifest.configurationUnknown = false; status.configurationUnknown = false;
    atomicJson(path.join(dir, 'manifest.json'), manifest);
    status.lifecycle = 'ready'; event('ready', { version: VERSION, sessionId: status.sessionId, model: status.model, role: status.role, thinking: status.thinking ?? null });
  } catch (error) {
    if (stopping) { await stopping; return; }
    status.error = errorValue(error).message; await stop('startup-failed');
    status.lifecycle = 'failed'; persist();
  }
}
if (import.meta.main) {
  try { await supervise(text(process.argv[2])); }
  catch (error) { console.error(JSON.stringify({ error: errorValue(error) })); process.exitCode = 1; }
}
