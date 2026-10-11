// Starts one isolated OMP RPC session in --safe-probe mode. Never sends a prompt.
import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { object, text, invariant, manifestAt } from '../src/common.ts';

const cli=fileURLToPath(new URL('../src/workerctl.ts',import.meta.url));
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'omp-rpc-smoke-')));
const home=path.join(root,'state'),repo=path.join(root,'repo'),plan=path.join(repo,'.plans/probe');
fs.mkdirSync(path.join(plan,'orchestration'),{recursive:true});fs.mkdirSync(path.join(plan,'phases'));
Bun.spawnSync(['git','init','-q',repo]);
for(const file of ['goal.md','phase-index.md','tasks.md'])fs.writeFileSync(path.join(plan,file),'No-inference protocol probe only\n');
const omp=Bun.which('omp');invariant(omp,'OMP_NOT_FOUND','Install OMP before running the opt-in smoke');
const catalog=Bun.spawnSync([omp,'models','--json'],{stdout:'pipe',stderr:'pipe'});
invariant(catalog.exitCode===0,'CATALOG_ERROR','Cannot read installed model catalog');
const data=object(JSON.parse(catalog.stdout.toString()));invariant(Array.isArray(data.models),'CATALOG_ERROR','Missing models');
const models=data.models.map(object).filter(m=>m.kind==='chat');
const supportsHigh=(model:Record<string,unknown>)=>Array.isArray(model.thinking)&&model.thinking.includes('high');
const selected=models[0];
invariant(selected,'MODEL_UNAVAILABLE','No chat model in the installed catalog');
const selector=text(selected.provider)+'/'+text(selected.id);
const target=models.find(m=>m!==selected&&supportsHigh(m)) || models.find(supportsHigh) || models.find(m=>m!==selected) || selected;
const targetSelector=text(target.provider)+'/'+text(target.id);
const thinking=supportsHigh(target)?'high':undefined;
const roles=['default','slow','plan','advisor','smol','tiny','commit'];
fs.writeFileSync(path.join(plan,'orchestration/models.yml'),'setupVersion: 2\nmodelRoles:\n'+roles.map(role=>`  ${role}: ${JSON.stringify(role==='advisor'?targetSelector:selector)}\n`).join(''));
const env={...process.env,OMP_WORKER_HOME:home};
async function run(...args:string[]){
 const p=Bun.spawn([process.execPath,cli,...args],{env,stdout:'pipe',stderr:'pipe'});
 const [out,err,exit]=await Promise.all([new Response(p.stdout).text(),new Response(p.stderr).text(),p.exited]);
 const result=object(JSON.parse(out));invariant(exit===0&&result.ok===true,'SMOKE_FAILED',out+' '+err);return object(result.result);
}
let started=false;
try{
 const preview=await run('check','--plan',plan,'--id','native-probe','--omp',omp);
 invariant(preview.role==='default'&&preview.model===selector&&!fs.existsSync(home)&&!fs.existsSync(path.join(plan,'orchestration/workers')),'SMOKE_FAILED','Read-only default profile preview had effects or selected the wrong model');
 started=true;
 const ready=await run('start','native-probe','--plan',plan,'--omp',omp,'--safe-probe');
 invariant(ready.lifecycle==='ready'&&ready.model===selector,'SMOKE_FAILED','RPC worker did not pin the selected model');
 const initial=manifestAt(path.join(home,'native-probe'));
 invariant(initial.profile===path.join(plan,'orchestration/workers/native-probe/models.yml')&&initial.role==='default','SMOKE_FAILED','Worker did not save its independent coordinator-default snapshot');
 fs.appendFileSync(path.join(plan,'orchestration/models.yml'),'# Parent changes must not mutate the running snapshot.\n');
 const state=await run('status','native-probe','--refresh');
 invariant(state.activity==='idle','SMOKE_FAILED','Expected an idle no-inference session');
 const configured=await run('configure','native-probe','--role','advisor',...(thinking?['--thinking',thinking]:[]),'--request-id','probe-configuration');
 invariant(configured.configurationOutcome==='verified','SMOKE_FAILED','Native task configuration did not verify');
 const next=await run('status','native-probe','--refresh');
 invariant(next.model===targetSelector&&next.role==='advisor'&&next.sessionId===state.sessionId,'SMOKE_FAILED','Configuration changed session or failed exact routing');
 if(thinking)invariant(next.thinking===thinking,'SMOKE_FAILED','Native thinking level was clamped or not applied');
 const saved=manifestAt(path.join(home,'native-probe'));
 invariant(saved.model===targetSelector&&saved.role==='advisor'&&(!thinking||saved.thinking===thinking),'SMOKE_FAILED','Selected settings not persisted');
 invariant(saved.profile===initial.profile&&saved.profileHash===initial.profileHash,'SMOKE_FAILED','Parent edit changed worker profile identity');
 const trace=await run('trace','native-probe','--request-id','probe-configuration');
 invariant(Array.isArray(trace.milestones)&&trace.milestones.length>0,'SMOKE_FAILED','Configuration milestones unavailable');
 const observed=await run('events','native-probe');invariant(Array.isArray(observed.events),'SMOKE_FAILED','Events unavailable');
 const stop=await run('stop','native-probe');invariant(stop.lifecycle==='stopped','SMOKE_FAILED','Clean stop failed');
 console.log(JSON.stringify({ok:true,model:selector,configuredModel:targetSelector,profile:saved.profile,profileHash:saved.profileHash,thinking:thinking??null,thinkingCheck:thinking?'verified':'skipped: catalog advertises no high support for selected chat model',sessionId:state.sessionId,checks:['read-only profile preview','coordinator default','independent snapshot','parent mutation isolation','start','get_state','set_model','configure role','exact observed configuration','persisted identity/settings','trace','events','abort','stdin EOF/stop'],inferenceCommandsSent:0,fixtureRoot:root}));
}finally{
 if(started){try{await run('stop','native-probe');}catch{}}
 // Retain bounded smoke evidence for inspection; no credentials are copied here.
}
