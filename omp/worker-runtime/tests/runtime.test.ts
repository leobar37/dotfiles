import { test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { recordMilestone, report, trace } from '../src/feedback.ts';
import { object, text, localRequest, manifestAt, readEvents, Journal, alive } from '../src/common.ts';

const cli=fileURLToPath(new URL('../src/workerctl.ts',import.meta.url));
const fake=fileURLToPath(new URL('./fake-omp.ts',import.meta.url));
let root:string,plan:string,home:string;
let env:Record<string,string|undefined>;
async function call(...args:string[]){
  const proc=Bun.spawn([process.execPath,cli,...args],{env,stdout:'pipe',stderr:'pipe'});
  const [stdout,stderr,exit]=await Promise.all([new Response(proc.stdout).text(),new Response(proc.stderr).text(),proc.exited]);
  let output:Record<string,unknown>;
  try{output=object(JSON.parse(stdout));}catch{throw new Error(`Invalid CLI output: ${stdout} ${stderr}`);}
  return {exit,output,stderr};
}
async function ok(...args:string[]){
  const result=await call(...args);expect(result.exit,JSON.stringify(result)).toBe(0);expect(result.output.ok).toBe(true);return object(result.output.result);
}
async function start(...extra:string[]){return ok('start','worker-a','--plan',plan,'--omp',fake,...extra);}
function assignment(message:string){const file=path.join(root,'assignment.txt');fs.writeFileSync(file,message);return file;}
async function dead(pid:number|undefined){
  if(!pid)return;
  // Cross-process integration: OS exit/reaping cannot be advanced by parent fake timers.
  for(let i=0;i<200;i++){
    if(!alive(pid))return;
    await Bun.sleep(20);
  }
  throw new Error(`Fixture process ${pid} did not terminate`);
}
beforeEach(()=>{
  root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'rpc-beta-')));home=path.join(root,'state');
  const repo=path.join(root,'repo with spaces');fs.mkdirSync(repo);
  const git=Bun.spawnSync(['git','init','-q',repo]);expect(git.exitCode).toBe(0);
  plan=path.join(repo,'.plans/example');fs.mkdirSync(path.join(plan,'orchestration'),{recursive:true});fs.mkdirSync(path.join(plan,'phases'));
  for(const name of ['goal.md','phase-index.md','tasks.md'])fs.writeFileSync(path.join(plan,name),'Fixture only\n');
  fs.writeFileSync(path.join(plan,'orchestration/models.yml'),'setupVersion: 2\nmodelRoles:\n  default: fixture/head\n  slow: fixture/head\n  plan: fixture/head\n  advisor: fixture/head\n  smol: fixture/worker\n  tiny: fixture/worker\n  commit: fixture/worker\n');
  env={...process.env,OMP_WORKER_HOME:home};
});
afterEach(async()=>{
  if(fs.existsSync(home))for(const id of fs.readdirSync(home).filter(name=>name.startsWith('worker'))){
    const dir=path.join(home,id);
    try{
      const m=manifestAt(dir);
      await call('stop',id);
      await dead(m.supervisorPid);await dead(m.workerPid);
      // Last-resort test teardown: only PIDs created inside this disposable fixture.
      for(const pid of [m.supervisorPid,m.workerPid])if(pid){try{process.kill(pid,'SIGKILL');}catch{}}
      try{fs.unlinkSync(m.socket);}catch{}
    }catch{}
  }
  fs.rmSync(root,{recursive:true,force:true});
});

test('start survives launching CLI exit, pins model, and exposes private state',async()=>{
  const status=await start();expect(status.lifecycle).toBe('ready');expect(status.model).toBe('fixture/head');expect(status.role).toBe('default');
  expect((await ok('status','worker-a','--refresh')).sessionId).toBe(status.sessionId);
  const manifest=manifestAt(path.join(home,'worker-a'));
  expect(manifest.profile).toBe(path.join(plan,'orchestration/workers/worker-a/models.yml'));
  expect(fs.readFileSync(manifest.profile,'utf8')).toBe(fs.readFileSync(path.join(plan,'orchestration/models.yml'),'utf8'));
  expect(fs.statSync(manifest.socket).mode & 0o777).toBe(0o600);
  expect(fs.statSync(path.join(home,'worker-a')).mode & 0o777).toBe(0o700);
  expect(manifest.supervisorPid).not.toBe(process.pid);
  expect((await call('list')).exit).toBe(0);
},30000);

test('prompt acknowledgment, correlated replay, events and task completion remain distinct',async()=>{
  await start();const file=assignment('finish');
  const result=await ok('prompt','worker-a','--file',file,'--request-id','task-one');expect(result.state).toBe('acknowledged');
  const settled=await ok('wait','worker-a','--until','idle','--timeout-ms','2000');expect(settled.timedOut).toBe(false);
  const replay=await ok('prompt','worker-a','--file',file,'--request-id','task-one');expect(replay.state).toBe('acknowledged');
  const m=manifestAt(path.join(home,'worker-a'));
  const assignments=fs.readFileSync(path.join(path.dirname(text(m.sessionFile)),'assignments.log'),'utf8');expect(assignments.trim().split('\n')).toHaveLength(1);
  const status=await ok('status','worker-a');expect(object(status.assignment).state).toBe('turn-ended');expect(status).not.toHaveProperty('done');
  expect((await ok('request','worker-a','--request-id','task-one')).state).toBe('acknowledged');
  const events=await ok('events','worker-a');expect(Array.isArray(events.events)).toBe(true);
  assignment('different');expect((await call('prompt','worker-a','--file',file,'--request-id','task-one')).exit).toBe(1);
},30000);

test('wait timeout does not abort work; steering and explicit abort work',async()=>{
  await start();await ok('prompt','worker-a','--file',assignment('hold'),'--request-id','hold-one');
  const waiting=await ok('wait','worker-a','--until','idle','--timeout-ms','30');expect(waiting.timedOut).toBe(true);
  expect((await ok('status','worker-a')).activity).toBe('running');
  await ok('steer','worker-a','--file',assignment('narrow scope'),'--request-id','steer-one');
  await ok('follow-up','worker-a','--file',assignment('then report'),'--request-id','follow-one');
  await ok('abort','worker-a','--request-id','abort-one');
  expect((await ok('status','worker-a','--refresh')).activity).toBe('idle');
},30000);

test('native response timeout records uncertainty and never replays automatically',async()=>{
  await start();const file=assignment('slow-ack');
  const result=await call('prompt','worker-a','--file',file,'--request-id','uncertain-one','--timeout-ms','20');
  expect(result.exit).toBe(1);expect(object(result.output.error).code).toBe('COMMAND_UNCONFIRMED');
  expect((await ok('request','worker-a','--request-id','uncertain-one')).state).toBe('outcome-unknown');
  await ok('wait','worker-a','--until','idle','--timeout-ms','2000');
  const replay=await call('prompt','worker-a','--file',file,'--request-id','uncertain-one');expect(replay.exit).toBe(1);
  expect((await ok('request','worker-a','--request-id','uncertain-one')).state).toBe('outcome-unknown');
  expect((await call('prompt','worker-a','--file',file,'--request-id','another-id')).exit).toBe(1);
},30000);

test('explicit assignment deadline interrupts without deleting partial files',async()=>{
  await start('--checkpoint-ms','100','--soft-budget-ms','200','--max-runtime-ms','500');
  await ok('prompt','worker-a','--file',assignment('hold'),'--request-id','deadline-one');
  const attention=await ok('wait','worker-a','--until','attention','--timeout-ms','2000');expect(attention.timedOut).toBe(false);
  await ok('wait','worker-a','--until','exit','--timeout-ms','5000');
  const status=object(JSON.parse(fs.readFileSync(path.join(home,'worker-a/status.json'),'utf8')));
  expect(status.lifecycle).toBe('interrupted');
  const m=manifestAt(path.join(home,'worker-a'));expect(fs.existsSync(path.join(path.dirname(text(m.sessionFile)),'assignments.log'))).toBe(true);
},30000);

test('resume requires explicit reconciliation and preserves exact session identity',async()=>{
  const status=await start();await ok('prompt','worker-a','--file',assignment('finish'),'--request-id','resume-one');
  await ok('wait','worker-a','--until','idle','--timeout-ms','2000');
  const old=manifestAt(path.join(home,'worker-a'));
  await ok('stop','worker-a');await dead(old.supervisorPid);
  expect((await call('resume','worker-a')).exit).toBe(1);
  const resumed=await ok('resume','worker-a','--reconciled');expect(resumed.sessionId).toBe(status.sessionId);
  const next=manifestAt(path.join(home,'worker-a'));expect(next.generation).not.toBe(old.generation);
  expect((await ok('request','worker-a','--request-id','resume-one')).state).toBe('acknowledged');
  await expect(localRequest(old,'status',{},500)).rejects.toBeDefined();
},30000);

test('duplicate IDs and simultaneous starts cannot create competing plan workers',async()=>{
  const args=['--plan',plan,'--omp',fake];
  const results=await Promise.all([call('start','worker-a',...args),call('start','worker-b',...args)]);
  expect(results.filter(r=>r.exit===0)).toHaveLength(1);
  expect(results.filter(r=>r.exit===1)).toHaveLength(1);
},30000);

test('safe probe never permits an inference-producing prompt',async()=>{
  await start('--safe-probe');
  const attempt=await call('prompt','worker-a','--file',assignment('hello'));
  expect(attempt.exit).toBe(1);expect(object(attempt.output.error).code).toBe('PROBE_READ_ONLY');
},30000);

test('profile placeholders and invalid budget fail before a supervisor starts',async()=>{
  fs.writeFileSync(path.join(plan,'orchestration/models.yml'),'setupVersion: 2\nmodelRoles: {}\n');
  expect((await call('start','worker-a','--plan',plan,'--omp',fake)).exit).toBe(1);
  expect(fs.existsSync(path.join(home,'worker-a'))).toBe(false);
  expect((await call('start','../escape','--plan',plan,'--omp',fake)).exit).toBe(1);
},30000);

test('unknown command, wrong generation and missing request are rejected',async()=>{
  await start();const m=manifestAt(path.join(home,'worker-a'));
  await expect(localRequest({...m,token:'wrong'},'status',{},1000)).rejects.toBeDefined();
  expect((await call('request','worker-a','--request-id','missing')).exit).toBe(1);
  expect((await call('not-a-command')).exit).toBe(1);
},30000);

test('rotated events report an explicit cursor gap',()=>{
  const dir=path.join(root,'journal');fs.mkdirSync(dir);const journal=new Journal(dir);
  for(let i=0;i<12;i++)journal.append('large',{text:'x'.repeat(1024*1024)});
  const result=readEvents(dir,0,1);expect(result.gap).toBe(true);expect(result.events).toHaveLength(1);
});

test('resume cannot steal a plan owned by a newer worker',async()=>{
  await start();const first=manifestAt(path.join(home,'worker-a'));
  await ok('stop','worker-a');await dead(first.supervisorPid);
  await ok('start','worker-b','--plan',plan,'--omp',fake);
  const result=await call('resume','worker-a','--reconciled');
  expect(result.exit).toBe(1);expect(object(result.output.error).code).toBe('PLAN_OWNED');
},30000);

test('supervisor death closes the guard and permits explicit session recovery',async()=>{
  const ready=await start();await ok('prompt','worker-a','--file',assignment('hold'),'--request-id','crash-recovery');
  const first=manifestAt(path.join(home,'worker-a'));
  process.kill(Number(first.supervisorPid),'SIGKILL');
  await dead(first.supervisorPid);await dead(first.workerPid);
  const status=await ok('status','worker-a');expect(status.lifecycle).toBe('unreachable');
  const resumed=await ok('resume','worker-a','--reconciled');
  expect(resumed.sessionId).toBe(ready.sessionId);
  const assignments=fs.readFileSync(path.join(path.dirname(text(first.sessionFile)),'assignments.log'),'utf8');
  expect(assignments.trim().split('\n')).toHaveLength(1);
},30000);

test('journal recovery repairs a torn tail and never reuses a durable cursor',()=>{
  const dir=path.join(root,'recover-journal');fs.mkdirSync(dir);
  const before=new Journal(dir);before.append('first',{});before.append('second',{});
  fs.appendFileSync(path.join(dir,'events.jsonl'),'{"torn":');
  const after=new Journal(dir,1);expect(after.append('third',{}).seq).toBe(3);
  expect(readEvents(dir,0,10).events.map(e=>e.seq)).toEqual([1,2,3]);
});

test('stop during native startup cannot publish ready afterward',async()=>{
  const marker=path.join(root,'startup.marker');
  env.FAKE_STARTUP_MARKER=marker;env.FAKE_HOLD_STARTUP='1';
  const seen=Promise.withResolvers<void>();
  const watcher=fs.watch(root,()=>{if(fs.existsSync(marker))seen.resolve();});
  const starting=call('start','worker-a','--plan',plan,'--omp',fake);
  try {
    await seen.promise; // Cross-process fixture signal, not a guessed sleep.
    const stopped=await ok('stop','worker-a');expect(stopped.lifecycle).toBe('stopped');
    expect((await starting).exit).toBe(1);
    const m=manifestAt(path.join(home,'worker-a'));await dead(m.supervisorPid);await dead(m.workerPid);
    expect(object(JSON.parse(fs.readFileSync(path.join(home,'worker-a/status.json'),'utf8'))).lifecycle).toBe('stopped');
  } finally { watcher.close(); }
},30000);

test('dead failed startup can be retired without deleting its evidence',async()=>{
  await start();const m=manifestAt(path.join(home,'worker-a'));
  process.kill(Number(m.supervisorPid),'SIGKILL');await dead(m.supervisorPid);await dead(m.workerPid);
  expect((await call('retire','worker-a')).exit).toBe(1);
  expect((await ok('retire','worker-a','--reconciled')).lifecycle).toBe('stopped');
  expect(fs.existsSync(path.join(home,'worker-a/events.jsonl'))).toBe(true);
  await ok('start','worker-b','--plan',plan,'--omp',fake);
},30000);

test('malformed native frames fail closed with bounded cleanup',async()=>{
  await start();await call('prompt','worker-a','--file',assignment('malformed'),'--request-id','bad-frame');
  const m=manifestAt(path.join(home,'worker-a'));await dead(m.supervisorPid);await dead(m.workerPid);
  expect((await ok('status','worker-a')).lifecycle).toBe('failed');
},30000);

test('disconnect after durable intent does not cancel the native assignment',async()=>{
  await start();const dir=path.join(home,'worker-a'),m=manifestAt(dir);
  const file=path.join(dir,'requests','disconnected.json');
  const persisted=Promise.withResolvers<void>(),acknowledged=Promise.withResolvers<void>();
  const watcher=fs.watch(path.dirname(file),()=>{
    if(!fs.existsSync(file))return;
    const entry=object(JSON.parse(fs.readFileSync(file,'utf8')));
    persisted.resolve();
    if(entry.state==='acknowledged')acknowledged.resolve();
  });
  const socket=net.createConnection(m.socket);
  socket.on('error',()=>socket.destroy());
  socket.on('connect',()=>socket.write(JSON.stringify({token:m.token,generation:m.generation,command:'prompt',args:{requestId:'disconnected',message:'slow-ack',timeoutMs:2000}})+'\n'));
  try {
    await persisted.promise;socket.destroy();
    await acknowledged.promise;
    expect((await ok('request','worker-a','--request-id','disconnected')).state).toBe('acknowledged');
    expect((await ok('wait','worker-a','--until','idle','--timeout-ms','2000')).timedOut).toBe(false);
  } finally {watcher.close();socket.destroy();}
},30000);

function nativeCommands() {
  const manifest=manifestAt(path.join(home,'worker-a'));
  return fs.readFileSync(path.join(path.dirname(text(manifest.sessionFile)),'commands.log'),'utf8').trim().split('\n').map(line=>object(JSON.parse(line)));
}

test('delta flood preserves lifecycle, bounded final text and offline report after rotation',async()=>{
  await start();
  await ok('prompt','worker-a','--file',assignment('flood'),'--request-id','flood-task');
  await ok('wait','worker-a','--until','idle','--timeout-ms','5000');
  const detail=await ok('report','worker-a','--request-id','flood-task');
  expect(detail.delivery).toBe('acknowledged');expect(detail.assignmentState).toBe('turn-ended');
  for(const key of ['sentAt','acknowledgedAt','startedAt','endedAt'])expect(typeof detail[key]).toBe('string');
  expect(Number(detail.observedExecutionMs)).toBeGreaterThanOrEqual(0);
  expect(detail.verification).toBe('not-performed');expect(detail.taskCompletion).toBe('not-asserted');
  expect(detail.suppressedUpdates).toBe(6000);
  expect(object(detail.finalResponse).truncated).toBe(true);
  expect(text(object(detail.finalResponse).text).length).toBe(16000);
  const dir=path.join(home,'worker-a'),raw=fs.readFileSync(path.join(dir,'events.jsonl'),'utf8');
  expect(raw.length).toBeLessThan(30000);
  for(const secret of ['PRIVATE_THINKING','PRIVATE_SYSTEM_PROMPT','PRIVATE_TOOL_SCHEMA','text_delta','toolcall_delta'])expect(raw).not.toContain(secret);
  expect(JSON.stringify(detail)).not.toContain('PRIVATE_THINKING');
  const recorded=await ok('trace','worker-a','--request-id','flood-task');
  const milestones=recorded.milestones as {seq:number;type:string;data:Record<string,unknown>}[];
  expect(milestones.map(e=>e.seq)).toEqual([...milestones.map(e=>e.seq)].sort((a,b)=>a-b));
  expect(milestones.some(e=>e.data.type==='agent_start')).toBe(true);
  expect(milestones.some(e=>e.data.type==='agent_end')).toBe(true);
  expect(milestones.some(e=>e.data.id===detail.rpcId)).toBe(true);
  const m=manifestAt(dir);await ok('stop','worker-a');await dead(m.supervisorPid);
  expect((await ok('report','worker-a','--request-id','flood-task')).endedAt).toBe(detail.endedAt);
  const journal=new Journal(dir);
  for(let i=0;i<12;i++)journal.append('rotation-fixture',{text:'x'.repeat(1024*1024)});
  expect(readEvents(dir).gap).toBe(true);
  expect((await ok('report','worker-a','--request-id','flood-task')).finalResponse).toEqual(detail.finalResponse);
},30000);

test('attention cursor consumes checkpoint once, ignores token/control noise, then wakes on soft budget and interruption',async()=>{
  await start('--checkpoint-ms','100','--soft-budget-ms','1800');
  await ok('prompt','worker-a','--file',assignment('hold'),'--request-id','cursor-task');
  const first=await ok('wait','worker-a','--until','attention','--timeout-ms','1500');
  expect(first.timedOut).toBe(false);
  const cursor=String(first.cursor);
  await ok('steer','worker-a','--file',assignment('small correction'),'--request-id','cursor-steer');
  const quiet=await ok('wait','worker-a','--until','attention','--after',cursor,'--timeout-ms','30');
  expect(quiet.timedOut).toBe(true);
  const budget=await ok('wait','worker-a','--until','attention','--after',String(quiet.cursor),'--timeout-ms','3000');
  expect(budget.timedOut).toBe(false);
  expect(object(object(budget.status).assignment).softBudgetExceeded).toBe(true);
  await ok('abort','worker-a','--request-id','cursor-abort');
  const interrupted=await ok('wait','worker-a','--until','attention','--after',String(budget.cursor),'--timeout-ms','1000');
  expect(interrupted.timedOut).toBe(false);
  expect((await ok('wait','worker-a','--until','attention','--after',String(interrupted.cursor),'--timeout-ms','30')).timedOut).toBe(true);
  const milestones=(await ok('trace','worker-a','--request-id','cursor-task')).milestones as {type:string;data:Record<string,unknown>}[];
  expect(milestones.some(e=>e.type==='soft_budget_exceeded')).toBe(true);
  expect(milestones.some(e=>e.type==='interrupted')).toBe(true);
  expect(milestones.some(e=>e.data.requestId==='cursor-steer')).toBe(true);
},30000);

test('idle configuration and per-prompt routing retain one session and dedup precedes all effects',async()=>{
  const initial=await start();
  const configured=await ok('configure','worker-a','--role','advisor','--thinking','high','--request-id','config-one');
  expect(configured.configurationOutcome).toBe('verified');
  expect(configured.rpcIds).toContain(configured.rpcId);
  expect((await ok('status','worker-a')).model).toBe('fixture/head');
  const before=nativeCommands().length;
  await ok('configure','worker-a','--role','advisor','--thinking','high','--request-id','config-one');
  expect(nativeCommands()).toHaveLength(before);
  expect(object((await call('configure','worker-a','--role','advisor','--thinking','low','--request-id','config-one')).output.error).code).toBe('REQUEST_CONFLICT');
  expect(nativeCommands()).toHaveLength(before);
  const file=assignment('finish');
  await ok('prompt','worker-a','--file',file,'--role','tiny','--thinking','low','--request-id','routed-one');
  await ok('wait','worker-a','--until','idle','--timeout-ms','2000');
  const detail=await ok('report','worker-a','--request-id','routed-one');
  expect(detail.role).toBe('tiny');expect(detail.model).toBe('fixture/worker');expect(detail.thinking).toBe('low');
  expect((await ok('status','worker-a')).sessionId).toBe(initial.sessionId);
  const count=nativeCommands().length;
  await ok('prompt','worker-a','--file',file,'--role','tiny','--thinking','low','--request-id','routed-one');
  expect(nativeCommands()).toHaveLength(count);
  expect((await call('prompt','worker-a','--file',file,'--role','smol','--thinking','low','--request-id','routed-one')).exit).toBe(1);
  const m=manifestAt(path.join(home,'worker-a'));
  expect(JSON.parse(fs.readFileSync(path.join(path.dirname(text(m.sessionFile)),'routing.log'),'utf8').trim())).toEqual({model:{provider:'fixture',id:'worker'},thinkingLevel:'low'});
  await ok('stop','worker-a');await dead(m.supervisorPid);
  const resumed=await ok('resume','worker-a','--reconciled');
  expect(resumed.role).toBe('tiny');expect(resumed.thinking).toBe('low');expect(resumed.sessionId).toBe(initial.sessionId);
},30000);

for(const activity of ['hold','blocked'])test(`${activity} rejects configuration and configured prompt before setters`,async()=>{
  await start();await ok('prompt','worker-a','--file',assignment(activity),'--request-id','busy-task');
  const before=nativeCommands().filter(c=>c.type==='set_model'||c.type==='set_thinking_level').length;
  for(const args of [
    ['configure','worker-a','--role','plan','--request-id','busy-config'],
    ['prompt','worker-a','--file',assignment('finish'),'--role','plan','--request-id','busy-next'],
  ])expect(object((await call(...args)).output.error).code).toBe('BUSY');
  expect(nativeCommands().filter(c=>c.type==='set_model'||c.type==='set_thinking_level')).toHaveLength(before);
},30000);

for(const flag of ['FAKE_COMPACT','FAKE_QUEUED'])test(`${flag} refuses configuration before effects`,async()=>{
  env[flag]='1';await start();
  const before=nativeCommands().filter(c=>c.type==='set_model').length;
  expect(object((await call('configure','worker-a','--role','slow','--request-id','busy-config')).output.error).code).toBe('BUSY');
  expect(nativeCommands().filter(c=>c.type==='set_model')).toHaveLength(before);
},30000);

test('all seven roles and aliases resolve YAML only; unlisted roles/models and inherit fail closed',async()=>{
  for(const role of ['default','slow','plan','advisor','smol','tiny','commit','worker','coordinator']){
    const checked=await ok('check','--plan',plan,'--omp',fake,'--role',role);
    expect(checked.role).toBe(role==='worker'?'smol':role==='coordinator'?'default':role);
  }
  await start('--safe-probe');
  const before=nativeCommands().length;
  for(const args of [
    ['configure','worker-a','--role','fixture/head','--request-id','invalid-role'],
    ['configure','worker-a','--role','advisor','--thinking','inherit','--request-id','invalid-thinking'],
    ['configure','worker-a','--role','advisor','--thinking','ultra','--request-id','invalid-level'],
  ])expect((await call(...args)).exit).toBe(1);
  expect(nativeCommands()).toHaveLength(before);
  await ok('configure','worker-a','--role','plan','--thinking','low','--request-id','probe-config');
  for(const command of ['prompt','steer','follow-up'])expect(object((await call(command,'worker-a','--file',assignment('no inference'))).output.error).code).toBe('PROBE_READ_ONLY');
  const profile=path.join(plan,'orchestration/models.yml');
  fs.writeFileSync(profile,fs.readFileSync(profile,'utf8').replaceAll('fixture/head','fixture/not-listed'));
  expect(object((await call('check','--plan',plan,'--omp',fake)).output.error).code).toBe('MODEL_UNAVAILABLE');
  await ok('configure','worker-a','--role','plan','--request-id','parent-is-isolated');
  const snapshot=manifestAt(path.join(home,'worker-a')).profile;
  fs.appendFileSync(snapshot,'# mutation\n');
  expect(object((await call('configure','worker-a','--role','plan','--request-id','changed-profile')).output.error).code).toBe('PROFILE_CHANGED');
},30000);

for(const mode of ['clamp','reject'])test(`thinking ${mode} records partial actual state and never sends prompt`,async()=>{
  env.FAKE_THINKING_MODE=mode;await start();
  const result=await call('prompt','worker-a','--file',assignment('must not send'),'--role','advisor','--thinking','high','--request-id','partial-config');
  expect(result.exit).toBe(1);
  const detail=await ok('report','worker-a','--request-id','partial-config');
  expect(detail.configurationOutcome).toBe('partial-observed');
  expect(detail.model).toBe('fixture/head');expect(detail.thinking).toBe(mode==='clamp'?'low':'off');
  expect(detail.startedAt).toBeNull();expect(detail.sentAt).toBeNull();expect(detail.observedExecutionMs).toBeNull();
  expect(nativeCommands().some(c=>c.type==='prompt')).toBe(false);
  expect(manifestAt(path.join(home,'worker-a')).configurationUnknown).toBe(true);
  expect(object((await call('prompt','worker-a','--file',assignment('no implicit retry'),'--request-id','blocked-next')).output.error).code).toBe('RECONCILIATION_REQUIRED');
},30000);

test('unreadable post-configuration state records unknown rather than rollback',async()=>{
  env.FAKE_CONFIG_STATE_FAIL='1';await start();
  expect((await call('configure','worker-a','--role','advisor','--thinking','high','--request-id','unknown-config')).exit).toBe(1);
  const detail=await ok('report','worker-a','--request-id','unknown-config');
  expect(detail.configurationOutcome).toBe('outcome-unknown');expect(detail.model).toBeNull();expect(detail.observedConfiguration).toBeNull();
  expect(nativeCommands().some(c=>c.type==='prompt')).toBe(false);
},30000);

test('native model substitution is rejected even after exact catalog selection',async()=>{
  env.FAKE_MODEL_SUBSTITUTE='1';await start('--role','smol');
  expect((await call('configure','worker-a','--role','advisor','--request-id','wrong-model')).exit).toBe(1);
  const detail=await ok('report','worker-a','--request-id','wrong-model');
  expect(detail.model).toBe('fixture/worker');expect(detail.configurationOutcome).toBe('partial-observed');
  expect(object(detail.error).code).toBe('MODEL_MISMATCH');
},30000);

test('v0.1 stopped manifests and request hashes stay readable without invented lifecycle times',async()=>{
  await start('--role','coordinator');
  const dir=path.join(home,'worker-a'),m=manifestAt(dir);
  await ok('stop','worker-a');await dead(m.supervisorPid);
  const legacy={...m,version:'0.1.0-beta.1',profile:path.join(plan,'orchestration/models.yml'),role:undefined,thinking:undefined,configurationUnknown:undefined};
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(legacy));
  const record={requestId:'legacy-one',rpcId:'legacy-native-id',command:'prompt',hash:createHash('sha256').update(JSON.stringify({command:'prompt',message:'legacy replay'})).digest('hex'),at:'2020-01-01T00:00:00.000Z',state:'acknowledged'};
  fs.writeFileSync(path.join(dir,'requests/legacy-one.json'),JSON.stringify(record));
  const before=fs.readFileSync(path.join(dir,'manifest.json'),'utf8');
  const detail=await ok('report','worker-a','--request-id','legacy-one');
  for(const key of ['sentAt','acknowledgedAt','startedAt','endedAt','observedExecutionMs','model','role','thinking'])expect(detail[key]).toBeNull();
  expect(detail.lifecycleKnown).toBe(false);expect(detail.taskCompletion).toBe('not-asserted');
  expect((await ok('trace','worker-a','--request-id','legacy-one')).legacyMissing).toBe(true);
  expect((await call('list')).exit).toBe(0);
  expect(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')).toBe(before);
  const resumed=await ok('resume','worker-a','--reconciled');
  expect(resumed.model).toBe('fixture/head');expect(resumed.role).toBe('default');
  expect(manifestAt(dir).profile).toBe(legacy.profile);
  await ok('prompt','worker-a','--file',assignment('legacy replay'),'--request-id','legacy-one');
  expect(nativeCommands().some(c=>c.type==='prompt')).toBe(false);
},30000);

test('assignment milestone retention is bounded with explicit gaps and unknown missing times',()=>{
  const dir=path.join(root,'bounded');fs.mkdirSync(path.join(dir,'requests'),{recursive:true});
  fs.writeFileSync(path.join(dir,'requests/task.json'),JSON.stringify({feedbackVersion:1,requestId:'task',command:'prompt',state:'acknowledged'}));
  for(let i=1;i<=150;i++)recordMilestone(dir,'task',{seq:i,at:new Date().toISOString(),type:'tool_execution_end',data:{}});
  const detail=trace(dir,'task');
  expect(detail.gap).toBe(true);expect(detail.dropped).toBe(22);expect(detail.milestones).toHaveLength(128);
  expect(object(report(dir,'task')).observedExecutionMs).toBeNull();
});

test('check with worker ID and explicit profile is read-only, including the registry',async()=>{
  const source=path.join(plan,'orchestration/approved.yml');
  fs.writeFileSync(source,fs.readFileSync(path.join(plan,'orchestration/models.yml'),'utf8').replaceAll('fixture/head','fixture/worker'));
  const checked=await ok('check','--plan',plan,'--id','worker-a','--profile','orchestration/approved.yml','--omp',fake);
  expect(checked.model).toBe('fixture/worker');expect(checked.role).toBe('default');
  expect(checked.profile).toBe(path.join(plan,'orchestration/workers/worker-a/models.yml'));
  expect(checked.sourceProfile).toBe(source);expect(checked.profileExists).toBe(false);
  expect(fs.existsSync(home)).toBe(false);
  expect(fs.existsSync(path.join(plan,'orchestration/workers'))).toBe(false);
  const ready=await start('--profile','orchestration/approved.yml','--role','slow');
  expect(ready.role).toBe('slow');expect(ready.model).toBe('fixture/worker');
  expect(fs.readFileSync(manifestAt(path.join(home,'worker-a')).profile,'utf8')).toBe(fs.readFileSync(source,'utf8'));
},30000);

test('explicit startup worker role retains the legacy smol choice',async()=>{
  const ready=await start('--role','worker');
  expect(ready.role).toBe('smol');expect(ready.model).toBe('fixture/worker');
},30000);

test('parent mutation cannot change prompt routing or block snapshot resume',async()=>{
  const ready=await start();
  const original=manifestAt(path.join(home,'worker-a'));
  fs.writeFileSync(path.join(plan,'orchestration/models.yml'),'invalid parent YAML for later executions\n');
  await ok('prompt','worker-a','--file',assignment('finish'),'--role','smol','--request-id','isolated-prompt');
  await ok('wait','worker-a','--until','idle','--timeout-ms','2000');
  expect((await ok('report','worker-a','--request-id','isolated-prompt')).model).toBe('fixture/worker');
  await ok('stop','worker-a');await dead(original.supervisorPid);await dead(original.workerPid);
  const resumed=await ok('resume','worker-a','--reconciled');
  expect(resumed.sessionId).toBe(ready.sessionId);expect(resumed.model).toBe('fixture/worker');expect(resumed.role).toBe('smol');
  const saved=manifestAt(path.join(home,'worker-a'));
  expect(saved.profile).toBe(original.profile);expect(saved.profileHash).toBe(original.profileHash);
  expect((await ok('check','--plan',plan,'--id','worker-a','--omp',fake)).profile).toBe(original.profile);
},30000);

test('snapshot mutation blocks prompt/configure/resume without replacing saved identity',async()=>{
  await start();const m=manifestAt(path.join(home,'worker-a'));
  fs.writeFileSync(m.profile,'invalid: [ YAML after start\n');
  for(const args of [
    ['prompt','worker-a','--file',assignment('must not send'),'--request-id','mutated-prompt'],
    ['configure','worker-a','--role','slow','--request-id','mutated-config'],
  ])expect(object((await call(...args)).output.error).code).toBe('PROFILE_CHANGED');
  expect(nativeCommands().some(command=>command.type==='prompt')).toBe(false);
  await ok('stop','worker-a');await dead(m.supervisorPid);await dead(m.workerPid);
  expect(object((await call('resume','worker-a','--reconciled')).output.error).code).toBe('PROFILE_CHANGED');
  expect(manifestAt(path.join(home,'worker-a')).generation).toBe(m.generation);
},30000);

test('v0.2 root-profile sessions resume in place and still reject root mutation',async()=>{
  await start('--role','smol');
  const dir=path.join(home,'worker-a'),m=manifestAt(dir);
  await ok('stop','worker-a');await dead(m.supervisorPid);await dead(m.workerPid);
  const legacy={...m,version:'0.2.0-beta.1',profile:path.join(plan,'orchestration/models.yml')};
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(legacy));
  fs.rmSync(path.join(plan,'orchestration/workers'),{recursive:true});
  expect((await call('list')).exit).toBe(0);
  expect(manifestAt(dir).version).toBe('0.2.0-beta.1');
  const resumed=await ok('resume','worker-a','--reconciled');
  expect(resumed.role).toBe('smol');expect(resumed.model).toBe('fixture/worker');
  const saved=manifestAt(dir);expect(saved.profile).toBe(legacy.profile);
  expect(fs.existsSync(path.join(plan,'orchestration/workers'))).toBe(false);
  await ok('stop','worker-a');await dead(saved.supervisorPid);await dead(saved.workerPid);
  fs.appendFileSync(legacy.profile,'# changed legacy root\n');
  expect(object((await call('resume','worker-a','--reconciled')).output.error).code).toBe('PROFILE_CHANGED');
},30000);

test('start rejects escaped profile paths before creating state or snapshots',async()=>{
  const outside=path.join(root,'outside.yml');
  fs.copyFileSync(path.join(plan,'orchestration/models.yml'),outside);
  fs.symlinkSync(outside,path.join(plan,'orchestration/escaped.yml'));
  for(const profile of [outside,'orchestration/escaped.yml']){
    const result=await call('start','worker-a','--plan',plan,'--profile',profile,'--omp',fake);
    expect(object(result.output.error).code).toBe('UNSAFE_PROFILE_PATH');
    expect(fs.existsSync(home)).toBe(false);
    expect(fs.existsSync(path.join(plan,'orchestration/workers'))).toBe(false);
  }
},30000);
