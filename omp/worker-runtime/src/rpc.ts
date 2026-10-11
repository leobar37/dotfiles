import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MAX_FRAME, RuntimeError, object, text } from './common.ts';

export class RpcProcess {
  readonly child: ChildProcessWithoutNullStreams;
  private pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: unknown) => void; timer: Timer }>();
  private buffer = Buffer.alloc(0);
  private exited = Promise.withResolvers<number | null>();
  exitCode: number | null | undefined;
  constructor(executable: string, args: string[], options: { cwd: string; onEvent: (event: Record<string, unknown>) => void; onError: (error: unknown) => void; onStderr: (data: Buffer) => void; onExit: (code: number | null) => void }) {
    const guard = fileURLToPath(new URL('./guard.ts', import.meta.url));
    const childEnvironment = { ...process.env };
    // A background RPC worker must not impersonate its launcher's visible Herdr pane.
    for (const key of Object.keys(childEnvironment)) if (key.startsWith('HERDR_')) delete childEnvironment[key];
    this.child = spawn(process.execPath, [guard, executable, ...args], { cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: true, env: childEnvironment });
    this.child.stdout.on('data', (data: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, data]);
      for (;;) {
        const index = this.buffer.indexOf(10);
        if (index < 0) break;
        const line = this.buffer.subarray(0, index);
        this.buffer = this.buffer.subarray(index + 1);
        if (line.length > MAX_FRAME * 8) { options.onError(new RuntimeError('FRAME_TOO_LARGE', 'Native RPC frame exceeds 8 MiB')); return; }
        if (!line.length) continue;
        try {
          const event = object(JSON.parse(line.toString('utf8')));
          const type = text(event.type);
          if (type === 'response' && typeof event.id === 'string') {
            const request = this.pending.get(event.id);
            if (request) {
              this.pending.delete(event.id); clearTimeout(request.timer);
              if (event.success === true) request.resolve(event.data);
              else request.reject(new RuntimeError('RPC_REJECTED', typeof event.error === 'string' ? event.error : 'Native command rejected'));
            }
          }
          options.onEvent(event);
        } catch (error) { options.onError(new RuntimeError('RPC_PROTOCOL_ERROR', error instanceof Error ? error.message : 'Invalid JSONL')); }
      }
      if (this.buffer.length > MAX_FRAME * 8) options.onError(new RuntimeError('FRAME_TOO_LARGE', 'Unterminated native RPC frame exceeds limit'));
    });
    this.child.stderr.on('data', options.onStderr);
    this.child.stdin.on('error', options.onError);
    this.child.on('error', error => { this.failPending(error); options.onError(error); });
    this.child.on('exit', code => {
      this.exitCode = code; this.failPending(new RuntimeError('WORKER_EXITED', 'Native worker exited before response'));
      this.exited.resolve(code); options.onExit(code);
    });
  }
  request(type: string, fields: Record<string, unknown> = {}, timeoutMs = 30000, id: string = randomUUID()): Promise<unknown> {
    if (this.exitCode !== undefined) return Promise.reject(new RuntimeError('WORKER_EXITED', 'Worker is not running'));
    if (this.pending.size >= 64) return Promise.reject(new RuntimeError('QUEUE_FULL', 'Too many pending RPC commands'));
    if (this.pending.has(id)) return Promise.reject(new RuntimeError('REQUEST_CONFLICT', 'Native request ID is already pending'));
    const request = Promise.withResolvers<unknown>();
    const timer = setTimeout(() => {
      this.pending.delete(id);
      request.reject(new RuntimeError('RPC_TIMEOUT', 'Response deadline exceeded; remote outcome is unknown and was not canceled'));
    }, timeoutMs);
    this.pending.set(id, { resolve: request.resolve, reject: request.reject, timer });
    this.child.stdin.write(JSON.stringify({ ...fields, type, id }) + '\n', error => {
      if (!error) return;
      const pending = this.pending.get(id);
      if (pending) { clearTimeout(pending.timer); this.pending.delete(id); pending.reject(error); }
    });
    return request.promise;
  }
  private failPending(error: unknown) {
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
  }
  async terminate(graceMs = 2000) {
    if (this.exitCode !== undefined) return;
    this.child.stdin.end();
    const grace = Promise.withResolvers<void>();
    const timer = setTimeout(grace.resolve, graceMs);
    await Promise.race([this.exited.promise, grace.promise]); clearTimeout(timer);
    if (this.exitCode !== undefined) return;
    // Only signal the process group created by this live ChildProcess, never a PID read from disk.
    if (this.child.pid) { try { process.kill(-this.child.pid, 'SIGTERM'); } catch { this.child.kill('SIGTERM'); } }
    const finalGrace = Promise.withResolvers<void>();
    const finalTimer = setTimeout(finalGrace.resolve, 1000);
    await Promise.race([this.exited.promise, finalGrace.promise]); clearTimeout(finalTimer);
    if (this.exitCode === undefined && this.child.pid) { try { process.kill(-this.child.pid, 'SIGKILL'); } catch { this.child.kill('SIGKILL'); } }
    await this.exited.promise;
  }
}
