// This process is spawned in its own process group. Native OMP and its ordinary
// descendants remain in that group. Parent pipe EOF triggers bounded cleanup.
import { spawn } from 'node:child_process';

const [executable, ...args] = process.argv.slice(2);
if (!executable) process.exit(2);
const child = spawn(executable, args, { stdio: ['pipe','pipe','pipe'], detached: false });
let closing = false;
let hardTimer: Timer | undefined;
function terminateGroup() {
  // Only this guard's group, created by RpcProcess with detached:true.
  try { process.kill(-process.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  clearTimeout(hardTimer);
  hardTimer = setTimeout(() => {
    try { process.kill(-process.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); process.exit(1); }
  }, 500);
}
function shutdown() {
  if (closing) return;
  closing = true;
  child.stdin.end();
  hardTimer = setTimeout(terminateGroup, 1500);
}
process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
child.stdin.on('error', shutdown);
process.stdin.on('end', shutdown);
process.stdin.on('error', shutdown);
process.stdout.on('error', shutdown);
process.stderr.on('error', shutdown);
process.on('SIGTERM', () => { if (!closing) { shutdown(); terminateGroup(); } });
process.on('SIGINT', shutdown);
child.on('error', () => { shutdown(); terminateGroup(); });
child.on('close', (code, signal) => {
  process.stderr.write(JSON.stringify({ type:'worker_runtime_native_exit', code, signal })+'\n');
  if (!closing) closing = true;
  terminateGroup();
});
