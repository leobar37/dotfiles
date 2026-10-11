#!/usr/bin/env bun
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { VERSION, RuntimeError, invariant, validId, privateDir, stateHome, workerDir, socketFor, atomicJson, jsonFile, object, text, integer, alive, manifestAt, localRequest, readEvents, Journal, errorValue, type Manifest } from './common.ts';
import { containedProfile, inspectPlan, inspectSavedModel, inspectWorkerProfile, materializeWorkerProfile } from './profile.ts';
import { report, trace } from './feedback.ts';

const HELP = `workerctl-beta ${VERSION}
Usage:
  workerctl-beta check --plan PATH [--id ID] [--profile PATH] [--role ROLE] [--omp PATH]
  workerctl-beta start ID --plan PATH [--profile PATH] [--role ROLE] [--omp PATH]
      [--checkpoint-ms 480000] [--soft-budget-ms 720000] [--max-runtime-ms 0] [--safe-probe]
  workerctl-beta list
  workerctl-beta status ID [--refresh]
  workerctl-beta prompt|steer|follow-up ID --file PATH [--request-id ID] [--timeout-ms 30000]
  workerctl-beta prompt ID --file PATH [--role ROLE] [--thinking LEVEL] [--request-id ID]
  workerctl-beta configure ID --role ROLE [--thinking LEVEL] --request-id ID
  workerctl-beta abort ID [--request-id ID]
  workerctl-beta request ID --request-id ID
  workerctl-beta report ID [--request-id ID]
  workerctl-beta trace ID --request-id ID
  workerctl-beta events ID [--after 0] [--limit 100]
  workerctl-beta wait ID [--until idle|attention|exit] [--after SEQ] [--timeout-ms 30000]
  workerctl-beta stop ID
  workerctl-beta resume ID --reconciled
  workerctl-beta retire ID --reconciled  # dead processes only; preserves all evidence

Start returns after RPC readiness; it does NOT submit work or run inference.
Use --safe-probe to disable OMP extensions/skills/rules/tools for a no-inference smoke.
A wait/client timeout never cancels execution. max-runtime-ms=0 disables ONLY this
supervisor's assignment deadline. No automatic replay, acceptance or task completion.
New workers default to coordinator role default; explicit worker remains an alias for smol.
Roles: default|slow|plan|advisor|smol|tiny|commit; coordinator=default.
--profile selects an existing approved YAML inside the plan (relative to the plan).
Start snapshots it create-only to orchestration/workers/ID/models.yml; existing snapshots
are never overwritten. Without --profile, inherit the parent YAML or reuse that snapshot.
check is read-only; --id previews that worker snapshot without creating it.
Thinking: off|minimal|low|medium|high|xhigh|max, exact native verification required.
Report/trace are worker observations, never task verification or Climier completion.
wait cursor is the latest observed operational sequence; reuse it as --after.
State: OMP_WORKER_HOME or ~/.local/state/omp-workers-beta (private local Unix socket).
`;
const ALLOWED: Record<string, string[]> = {
  check: ['plan','id','profile','role','omp'], start: ['plan','profile','role','omp','checkpoint-ms','soft-budget-ms','max-runtime-ms','safe-probe'],
  list: [], status: ['refresh'], prompt: ['file','request-id','timeout-ms','role','thinking'], steer: ['file','request-id','timeout-ms'],
  configure: ['role','thinking','request-id','timeout-ms'], report: ['request-id'], trace: ['request-id'],
  'follow-up': ['file','request-id','timeout-ms'], abort: ['request-id','timeout-ms'], request: ['request-id'],
  events: ['after','limit'], wait: ['until','timeout-ms','after'], stop: [], resume: ['reconciled'], retire: ['reconciled'],
};
function parse(argv: string[]) {
  const command = argv.shift() || 'help';
  if (['help','--help','-h'].includes(command)) return { command: 'help', id: '', flags: {} as Record<string,string> };
  invariant(Object.hasOwn(ALLOWED, command), 'USAGE', `Unknown command: ${command}`);
  const id = ['check','list'].includes(command) ? '' : validId(text(argv.shift()));
  const flags: Record<string,string> = {};
  while (argv.length) {
    const flag = text(argv.shift()); invariant(flag.startsWith('--'), 'USAGE', `Unexpected argument: ${flag}`);
    const key = flag.slice(2);
    invariant(ALLOWED[command].includes(key) && flags[key] === undefined, 'USAGE', `Unknown or repeated option: ${flag}`);
    if (['refresh','safe-probe','reconciled'].includes(key)) flags[key] = 'true';
    else { const value = text(argv.shift()); invariant(!value.startsWith('--'), 'USAGE', `Missing value for ${flag}`); flags[key] = value; }
  }
  return { command,id,flags };
}
function snapshot(dir: string, manifest: Manifest) {
  const saved = fs.existsSync(path.join(dir,'status.json')) ? object(jsonFile(path.join(dir,'status.json'))) : { lifecycle:'starting',activity:'unknown' };
  return { ...saved, id: manifest.id, sessionId: manifest.sessionId, sessionFile: manifest.sessionFile,
    lifecycle: typeof saved.lifecycle === 'string' ? saved.lifecycle : 'unknown',
    eventSeq: typeof saved.eventSeq === 'number' ? integer(saved.eventSeq) : 0,
    supervisorAlive: alive(manifest.supervisorPid), workerAlive: alive(manifest.workerPid),
    plan: manifest.plan, profile: manifest.profile, profileHash: manifest.profileHash, model: manifest.model, role: manifest.role, thinking: manifest.thinking, configurationUnknown: manifest.configurationUnknown, version: manifest.version };
}
function assertPlanUnowned(home: string, plan: string, excluding?: string) {
  for (const name of fs.readdirSync(home).filter(name=>/^[a-z][a-z0-9_-]{0,40}$/.test(name))) {
    if (name === excluding) continue;
    const dir=path.join(home,name);
    if (!fs.existsSync(path.join(dir,'manifest.json'))) continue;
    const previous=manifestAt(dir);
    if (previous.plan!==plan) continue;
    const state=snapshot(dir,previous);
    invariant(!alive(previous.supervisorPid)&&!alive(previous.workerPid)&&state.lifecycle==='stopped','PLAN_OWNED',`Plan has worker ${name}; stop/reconcile it before another execution`);
  }
}
async function startSupervisor(dir: string, manifest: Manifest) {
  const supervisor = fileURLToPath(new URL('./supervisor.ts',import.meta.url));
  const logPath = path.join(dir,'supervisor.log');
  if (fs.existsSync(logPath) && fs.statSync(logPath).size > 2 * 1024 * 1024) fs.renameSync(logPath,logPath+'.1');
  const log = fs.openSync(path.join(dir,'supervisor.log'),'a',0o600);
  try {
    const child = spawn(process.execPath,[supervisor,dir],{detached:true,stdio:['ignore',log,log],env:process.env});
    const spawned = Promise.withResolvers<void>();
    child.once('spawn',spawned.resolve);child.once('error',spawned.reject);
    await spawned.promise; child.unref();
  } finally { fs.closeSync(log); }
  const deadline = Date.now()+35000;
  while (Date.now()<deadline) {
    try {
      const result = object(await localRequest(manifest,'status',{},1000));
      if (result.lifecycle === 'ready') return result;
      if (['failed','interrupted','stopped'].includes(String(result.lifecycle))) throw new RuntimeError('START_FAILED',String(result.error || 'Worker stopped during startup'),{id:manifest.id});
    } catch (error) { if (error instanceof RuntimeError && error.code==='START_FAILED') throw error; }
    if (fs.existsSync(path.join(dir,'status.json'))) {
      const status = object(jsonFile(path.join(dir,'status.json')));
      if (status.generation===manifest.generation && ['failed','interrupted','stopped'].includes(String(status.lifecycle))) throw new RuntimeError('START_FAILED',String(status.error || status.lifecycle),{id:manifest.id});
    }
    await Bun.sleep(100);
  }
  return { id:manifest.id, lifecycle:'starting', note:'Startup wait ended; inspect status. The supervisor has its own startup deadline and was not canceled.' };
}
function lockStart(home: string) {
  const lock = path.join(home,'.start-lock');
  try { fs.mkdirSync(lock,{mode:0o700}); }
  catch (error) {
    const ownerFile = path.join(lock,'owner.json');
    if (!fs.existsSync(ownerFile)) throw new RuntimeError('START_LOCKED','Another start/resume owns the registry; retry after it exits');
    const owner = object(jsonFile(ownerFile));
    invariant(!alive(owner.pid),'START_LOCKED','Another start/resume is still active');
    invariant(!fs.lstatSync(lock).isSymbolicLink(),'UNSAFE_PATH','Unsafe registry lock');
    fs.unlinkSync(ownerFile);fs.rmdirSync(lock);fs.mkdirSync(lock,{mode:0o700});
  }
  atomicJson(path.join(lock,'owner.json'),{pid:process.pid});
  return () => { fs.unlinkSync(path.join(lock,'owner.json'));fs.rmdirSync(lock); };
}
export async function main(argv: string[]) {
  process.umask(0o077);
  const { command,id,flags } = parse([...argv]);
  if (command==='help') { console.log(HELP); return; }
  // Preflight must not create the registry or materialize a worker profile.
  const startup = command === 'check' || command === 'start' ? (() => {
    const executable = flags.omp ? fs.realpathSync(flags.omp) : Bun.which('omp');
    invariant(executable, 'OMP_NOT_FOUND', 'omp is not on PATH');
    const selected = inspectWorkerProfile(text(flags.plan), command === 'start' ? id : flags.id, flags.profile, flags.role ?? 'default', executable);
    const validated = inspectPlan(text(flags.plan), selected.role, executable, undefined, selected.sourceProfile);
    return { executable, selected, validated };
  })() : undefined;
  if (command === 'check' && startup) {
    return { ...startup.validated, ...startup.selected, version: VERSION, valid: true, note: 'Read-only profile/plan/catalog/progress preflight; snapshot not created. No inference or worker startup tested; provider inference authorization remains unverified.' };
  }
  const home = stateHome();
  if (command==='list') {
    const entries: unknown[]=[];
    for (const name of fs.readdirSync(home).filter(name=>/^[a-z][a-z0-9_-]{0,40}$/.test(name))) {
      try { const dir=path.join(home,name);entries.push(snapshot(dir,manifestAt(dir))); }
      catch (error) { entries.push({id:name,error:errorValue(error)}); }
    }
    return entries;
  }
  if (command==='start') {
    invariant(startup, 'INVALID_PLAN', 'Start preflight is required');
    const { executable, selected, validated } = startup;
    const checkpointMs=integer(Number(flags['checkpoint-ms'] ?? 480000));
    const softBudgetMs=integer(Number(flags['soft-budget-ms'] ?? 720000));
    const maxRuntimeMs=integer(Number(flags['max-runtime-ms'] ?? 0));
    invariant(!checkpointMs || !softBudgetMs || checkpointMs<softBudgetMs,'INVALID_BUDGET','Checkpoint must precede soft budget');
    invariant(!maxRuntimeMs || (checkpointMs<maxRuntimeMs && softBudgetMs<maxRuntimeMs),'INVALID_BUDGET','Hard deadline must leave time after checkpoint/soft budget');
    const unlock=lockStart(home);
    try {
      assertPlanUnowned(home, validated.plan);
      const dir=workerDir(id);
      invariant(!fs.existsSync(dir),'ID_EXISTS','Worker ID already exists; use explicit resume --reconciled or choose a fresh ID');
      const selection = materializeWorkerProfile(validated.plan, selected);
      fs.mkdirSync(dir,{mode:0o700});privateDir(path.join(dir,'sessions'));
      const manifest: Manifest={version:VERSION,id,generation:randomUUID(),token:randomBytes(32).toString('hex'),socket:socketFor(dir),...validated,...selection,executable,createdAt:new Date().toISOString(),checkpointMs,softBudgetMs,maxRuntimeMs,safeProbe:flags['safe-probe']==='true'};
      atomicJson(path.join(dir,'manifest.json'),manifest);
      return await startSupervisor(dir,manifest);
    } finally { unlock(); }
  }
  const dir=workerDir(id);
  let manifest=manifestAt(dir);
  if (command==='retire') {
    invariant(flags.reconciled==='true','RECONCILIATION_REQUIRED','Retirement requires review of partial effects and --reconciled');
    const unlock=lockStart(home);
    try {
      manifest=manifestAt(dir);
      invariant(!alive(manifest.supervisorPid)&&!alive(manifest.workerPid),'WORKER_STILL_ALIVE','Retirement never kills a process');
      const prior=snapshot(dir,manifest);
      const journal=new Journal(dir,typeof prior.eventSeq==='number'?prior.eventSeq:0);
      journal.append('retired',{reason:'Operator explicitly reconciled dead worker effects'});
      const retired={...prior,lifecycle:'stopped',activity:'unknown',eventSeq:journal.seq,retiredAt:new Date().toISOString()};
      atomicJson(path.join(dir,'status.json'),retired);
      return retired;
    } finally { unlock(); }
  }
  if (command==='resume') {
    invariant(flags.reconciled==='true','RECONCILIATION_REQUIRED','Inspect partial changes and requests; resume requires --reconciled');
    const unlock=lockStart(home);
    try {
      manifest=manifestAt(dir);
      assertPlanUnowned(home, manifest.plan, id);
      invariant(!alive(manifest.supervisorPid)&&!alive(manifest.workerPid),'WORKER_STILL_ALIVE','Refusing to start a duplicate or kill a PID read from disk');
      // Legacy root profiles remain authoritative; new workers validate only their snapshot.
      containedProfile(manifest.plan, manifest.profile);
      const selection=inspectSavedModel(manifest.profile,manifest.model,manifest.role,manifest.executable,manifest.profileHash);
      inspectPlan(manifest.plan, selection.role, manifest.executable, undefined, manifest.profile);
      invariant(manifest.sessionFile&&fs.existsSync(manifest.sessionFile),'NO_SESSION','No persisted session file exists; do not pretend this worker is resumable');
      const session=fs.realpathSync(manifest.sessionFile);
      invariant(session.startsWith(fs.realpathSync(path.join(dir,'sessions'))+path.sep),'INVALID_SESSION','Saved session escapes this worker directory');
      const lock=path.join(dir,'supervisor.lock');
      if (fs.existsSync(lock)) {
        const owner=object(jsonFile(lock));invariant(!alive(owner.pid),'WORKER_STILL_ALIVE','Supervisor lock is still owned');fs.unlinkSync(lock);
      }
      const resumed: Manifest={...manifest,version:VERSION,role:selection.role,generation:randomUUID(),token:randomBytes(32).toString('hex'),supervisorPid:undefined,workerPid:undefined,resumeFile:session};
      atomicJson(path.join(dir,'manifest.json'),resumed);
      return await startSupervisor(dir,resumed);
    } finally { unlock(); }
  }
  if (command==='events') return readEvents(dir,integer(Number(flags.after ?? 0)),integer(Number(flags.limit ?? 100),1,200));
  if (command==='report') return report(dir,flags['request-id']);
  if (command==='trace') return trace(dir,text(flags['request-id']));
  if (command==='status') {
    try { return await localRequest(manifest,flags.refresh?'state':'status',{},flags.refresh?12000:1500); }
    catch (error) {
      if (flags.refresh) throw error;
      const saved = snapshot(dir,manifest);
      const terminal = !saved.supervisorAlive && !saved.workerAlive && ['stopped','failed','interrupted'].includes(saved.lifecycle);
      return {...saved,lifecycle:terminal?saved.lifecycle:'unreachable',lastKnownLifecycle:saved.lifecycle,note:'No live control connection; do not infer completion or kill recorded PIDs.'};
    }
  }
  if (command==='request') {
    const requestId=text(flags['request-id']);invariant(/^[A-Za-z0-9_-]{1,100}$/.test(requestId),'INVALID_REQUEST_ID','Invalid request ID');
    const file=path.join(dir,'requests',requestId+'.json');invariant(fs.existsSync(file),'NOT_FOUND','Request not found');return jsonFile(file);
  }
  if (command==='wait') {
    const timeoutMs=integer(Number(flags['timeout-ms'] ?? 30000),1,3600000);
    return localRequest(manifest,'wait',{until:flags.until || 'attention',after:integer(Number(flags.after ?? 0)),timeoutMs},timeoutMs+2000);
  }
  if (command==='stop') return localRequest(manifest,'stop',{},15000);
  if (command==='configure') text(flags['request-id']); // Configuration must be explicitly reconcilable.
  const requestId=flags['request-id'] || randomUUID();
  const args: Record<string,unknown>={requestId,timeoutMs:integer(Number(flags['timeout-ms'] ?? 30000),1,120000)};
  if (flags.role !== undefined) args.role=flags.role;
  if (flags.thinking !== undefined) args.thinking=flags.thinking;
  if (command==='configure') args.role=text(flags.role);
  if (command!=='abort' && command!=='configure') { const file=text(flags.file);invariant(fs.statSync(file).size<=128*1024,'MESSAGE_TOO_LARGE','Assignment exceeds 128 KiB');args.message=fs.readFileSync(file,'utf8'); }
  // Print the ID before transmission, so callers can reconcile after their connection dies.
  console.error(JSON.stringify({requestId,workerId:id}));
  const result = object(await localRequest(manifest,command,args,Number(args.timeoutMs)+12000));
  if (result.state !== 'acknowledged') throw new RuntimeError('COMMAND_UNCONFIRMED', 'Native delivery was not confirmed; inspect the saved request before retrying. Execution was not automatically canceled.', result);
  return result;
}
if (import.meta.main) {
  try { const result=await main(process.argv.slice(2));if(result!==undefined)console.log(JSON.stringify({ok:true,result})); }
  catch(error) { console.log(JSON.stringify({ok:false,error:errorValue(error)}));process.exitCode=1; }
}
