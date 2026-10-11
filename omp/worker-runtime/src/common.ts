import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { createHash, randomUUID } from 'node:crypto';

export const VERSION = '0.3.0-beta.1';
export const READABLE_VERSIONS = ['0.1.0-beta.1', '0.2.0-beta.1', VERSION];
export const MODEL_ROLES = ['default','slow','plan','advisor','smol','tiny','commit'] as const;
export type ModelRole = typeof MODEL_ROLES[number];
export const THINKING_LEVELS = ['off','minimal','low','medium','high','xhigh','max'] as const;
export type ThinkingLevel = typeof THINKING_LEVELS[number];
export function modelRole(value: unknown): ModelRole {
  const role = value === 'worker' ? 'smol' : value === 'coordinator' ? 'default' : value;
  invariant(MODEL_ROLES.includes(role as ModelRole), 'INVALID_ROLE', 'Choose a declared native model role (or worker/coordinator alias)');
  return role as ModelRole;
}
export function thinkingLevel(value: unknown): ThinkingLevel {
  invariant(THINKING_LEVELS.includes(value as ThinkingLevel), 'INVALID_THINKING', `thinking must be an explicit native level: ${THINKING_LEVELS.join('|')} (inherit is not a per-task level)`);
  return value as ThinkingLevel;
}
export const MAX_FRAME = 1024 * 1024;
export class RuntimeError extends Error {
  constructor(public code: string, message: string, public details?: unknown) { super(message); }
}
export function invariant(value: unknown, code: string, message: string): asserts value {
  if (!value) throw new RuntimeError(code, message);
}
export function validId(id: string): string {
  invariant(/^[a-z][a-z0-9_-]{0,40}$/.test(id), 'INVALID_ID', 'Worker ID must match [a-z][a-z0-9_-]{0,40}');
  return id;
}
export function privateDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const st = fs.lstatSync(dir);
  invariant(st.isDirectory() && !st.isSymbolicLink(), 'UNSAFE_PATH', `Not a private directory: ${dir}`);
  invariant(!process.getuid || st.uid === process.getuid(), 'UNSAFE_OWNER', `Directory belongs to another user: ${dir}`);
  fs.chmodSync(dir, 0o700);
}
export function stateHome() {
  const configured = process.env.OMP_WORKER_HOME || path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local/state'), 'omp-workers-beta');
  invariant(path.isAbsolute(configured), 'INVALID_HOME', 'OMP_WORKER_HOME/XDG_STATE_HOME must be absolute');
  privateDir(configured);
  return fs.realpathSync(configured);
}
export function workerDir(id: string) { return path.join(stateHome(), validId(id)); }
export function socketFor(dir: string) {
  const base = path.join(os.tmpdir(), `omp-workers-beta-${process.getuid?.() ?? 'user'}`);
  privateDir(base);
  return path.join(fs.realpathSync(base), createHash('sha256').update(dir).digest('hex').slice(0, 24) + '.sock');
}
export function atomicJson(file: string, data: unknown) {
  const temporary = file + '.' + randomUUID() + '.tmp';
  const fd = fs.openSync(temporary, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(data, null, 2) + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(temporary, file);
}
export function jsonFile(file: string): unknown { return JSON.parse(fs.readFileSync(file, 'utf8')); }
export function object(value: unknown): Record<string, unknown> {
  invariant(value !== null && typeof value === 'object' && !Array.isArray(value), 'INVALID_DATA', 'Expected an object');
  return value as Record<string, unknown>;
}
export function text(value: unknown): string {
  invariant(typeof value === 'string' && value.length > 0, 'INVALID_DATA', 'Expected a nonempty string');
  return value;
}
export function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  invariant(typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max, 'INVALID_DATA', `Expected an integer in ${min}..${max}`);
  return value;
}
export function alive(pid: unknown): boolean {
  if (!Number.isSafeInteger(pid) || Number(pid) <= 0) return false;
  try {
    process.kill(Number(pid), 0);
    if (process.platform === 'linux') {
      try {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
        if (stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z ')) return false;
      } catch { /* Process may have exited between the checks. */ }
    }
    return true;
  }
  catch (e) { return e instanceof Error && 'code' in e && e.code === 'EPERM'; }
}
export interface Manifest {
  version: string; id: string; generation: string; token: string; socket: string;
  plan: string; repo: string; profile: string; profileHash: string; model: string;
  role?: ModelRole; thinking?: ThinkingLevel; configurationUnknown?: boolean;
  executable: string; createdAt: string; supervisorPid?: number; workerPid?: number;
  sessionId?: string; sessionFile?: string; resumeFile?: string;
  checkpointMs: number; softBudgetMs: number; maxRuntimeMs: number; safeProbe: boolean;
}
export interface Status {
  id: string; generation: string; lifecycle: 'starting'|'ready'|'stopping'|'stopped'|'failed'|'interrupted';
  activity: 'unknown'|'idle'|'dispatching'|'running'|'blocked';
  updatedAt: string; heartbeatAt: string; lastEventAt?: string; eventSeq: number;
  sessionId?: string; sessionFile?: string; model?: string; role?: ModelRole; thinking?: ThinkingLevel;
  attentionSeq?: number; configurationUnknown?: boolean;
  assignment?: { requestId: string; startedAt: number; state: 'active'|'turn-ended'|'interrupted'|'outcome-unknown'; checkpointDue: boolean; softBudgetExceeded: boolean };
  error?: string; exitCode?: number | null;
}
export function manifestAt(dir: string): Manifest {
  const st = fs.lstatSync(dir);
  invariant(st.isDirectory() && !st.isSymbolicLink(), 'UNSAFE_PATH', 'Worker directory must not be a symlink');
  invariant(!process.getuid || st.uid === process.getuid(), 'UNSAFE_OWNER', 'Worker directory belongs to another user');
  const value = object(jsonFile(path.join(dir, 'manifest.json')));
  invariant(READABLE_VERSIONS.includes(String(value.version)), 'VERSION_MISMATCH', 'Worker runtime version differs; do not resume with incompatible code');
  invariant(value.socket === socketFor(dir), 'INVALID_SOCKET', 'Unexpected worker socket');
  return {
    version: text(value.version), id: validId(text(value.id)), generation: text(value.generation),
    token: text(value.token), socket: text(value.socket), plan: text(value.plan),
    repo: text(value.repo), profile: text(value.profile), profileHash: text(value.profileHash),
    model: text(value.model), executable: text(value.executable), createdAt: text(value.createdAt),
    role: value.role === undefined ? undefined : modelRole(value.role),
    thinking: value.thinking === undefined ? undefined : thinkingLevel(value.thinking),
    configurationUnknown: value.configurationUnknown === true,
    supervisorPid: value.supervisorPid === undefined ? undefined : integer(value.supervisorPid, 1),
    workerPid: value.workerPid === undefined ? undefined : integer(value.workerPid, 1),
    sessionId: value.sessionId === undefined ? undefined : text(value.sessionId),
    sessionFile: value.sessionFile === undefined ? undefined : text(value.sessionFile),
    resumeFile: value.resumeFile === undefined ? undefined : text(value.resumeFile),
    checkpointMs: integer(value.checkpointMs), softBudgetMs: integer(value.softBudgetMs),
    maxRuntimeMs: integer(value.maxRuntimeMs), safeProbe: value.safeProbe === true,
  };
}
export class Journal {
  seq: number;
  constructor(private dir: string, seq = 0) {
    this.seq = seq;
    for (const suffix of ['.3','.2','.1','']) {
      const file = path.join(dir,'events.jsonl'+suffix);
      if (!fs.existsSync(file)) continue;
      const bytes = fs.readFileSync(file);
      const end = bytes.lastIndexOf(10) + 1;
      // An incomplete final JSONL record was not committed. Remove it before appending.
      if (!suffix && end !== bytes.length) fs.truncateSync(file,end);
      for (const line of bytes.subarray(0,end).toString().split('\n')) {
        if (!line) continue;
        try { this.seq = Math.max(this.seq, integer(object(JSON.parse(line)).seq, 1)); } catch { /* Ignore torn/corrupt records. */ }
      }
    }
  }
  append(type: string, data: unknown) {
    const file = path.join(this.dir, 'events.jsonl');
    if (fs.existsSync(file) && fs.statSync(file).size >= 2 * 1024 * 1024) {
      for (let n = 3; n >= 1; n--) {
        const source = n === 1 ? file : file + '.' + (n - 1);
        const target = file + '.' + n;
        if (fs.existsSync(source)) fs.renameSync(source, target);
      }
    }
    const entry = { seq: ++this.seq, at: new Date().toISOString(), type, data };
    const fd = fs.openSync(file, 'a', 0o600);
    try { fs.writeSync(fd, JSON.stringify(entry) + '\n'); } finally { fs.closeSync(fd); }
    return entry;
  }
}
export function readEvents(dir: string, after = 0, limit = 100) {
  invariant(Number.isSafeInteger(after) && after >= 0, 'INVALID_CURSOR', 'after must be a nonnegative integer');
  invariant(Number.isSafeInteger(limit) && limit >= 1 && limit <= 200, 'INVALID_LIMIT', 'limit must be 1..200');
  const entries: { seq: number; at: string; type: string; data: unknown }[] = [];
  for (const suffix of ['.3', '.2', '.1', '']) {
    const file = path.join(dir, 'events.jsonl' + suffix);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line) continue;
      try {
        const entry = object(JSON.parse(line));
        entries.push({ seq: integer(entry.seq, 1), at: text(entry.at), type: text(entry.type), data: entry.data });
      } catch { /* A partial trailing frame after a crash is not an event. */ }
    }
  }
  const selected = entries.filter(e => e.seq > after).slice(0, limit);
  return { events: selected, cursor: selected.at(-1)?.seq ?? after, gap: entries.length > 0 && after < entries[0].seq - 1 };
}
export function errorValue(error: unknown) {
  if (error instanceof RuntimeError) return { code: error.code, message: error.message, details: error.details };
  return { code: 'RUNTIME_ERROR', message: error instanceof Error ? error.message : String(error) };
}
export function localRequest(manifest: Manifest, command: string, args: Record<string, unknown> = {}, timeoutMs = 35000): Promise<unknown> {
  const { promise, resolve, reject } = Promise.withResolvers<unknown>();
  const socket = net.createConnection(manifest.socket);
  let buffer = Buffer.alloc(0), settled = false;
  const finish = (error?: unknown, data?: unknown) => {
    if (settled) return; settled = true; clearTimeout(timer); socket.destroy();
    error ? reject(error) : resolve(data);
  };
  const timer = setTimeout(() => finish(new RuntimeError('CLIENT_TIMEOUT', 'Only the local wait expired; worker execution was not canceled', { requestId: args.requestId })), timeoutMs);
  socket.on('error', error => finish(error));
  socket.on('end', () => { if (!settled) finish(new RuntimeError('CONNECTION_LOST', 'Connection ended without a result; inspect the request before retrying')); });
  socket.on('connect', () => socket.write(JSON.stringify({ token: manifest.token, generation: manifest.generation, command, args }) + '\n'));
  socket.on('data', data => {
    buffer = Buffer.concat([buffer, typeof data === 'string' ? Buffer.from(data) : data]);
    if (buffer.length > MAX_FRAME) return finish(new RuntimeError('FRAME_TOO_LARGE', 'Control response exceeds limit'));
    const newline = buffer.indexOf(10);
    if (newline < 0) return;
    try {
      const response = object(JSON.parse(buffer.subarray(0, newline).toString()));
      if (response.ok === true) finish(undefined, response.result);
      else {
        const failure = object(response.error);
        finish(new RuntimeError(text(failure.code), text(failure.message), failure.details));
      }
    } catch (error) { finish(error); }
  });
  return promise;
}
