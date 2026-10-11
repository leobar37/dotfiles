#!/usr/bin/env bun
// Real timers deliberately simulate delayed native responses in a separate process;
// parent fake timers cannot exercise OS-pipe deadlines or process cleanup.
import * as fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const args=process.argv.slice(2);
if(args[0]==='models') {
  console.log(JSON.stringify({models:[{provider:'fixture',id:'head'},{provider:'fixture',id:'worker'}]}));process.exit(0);
}
if(args[0]==='--version') {console.log('omp/fixture');process.exit(0);}
const option=(key:string)=>args[args.indexOf(key)+1];
const directory=option('--session-dir');fs.mkdirSync(directory,{recursive:true});
const sessionFile=args.includes('--resume')?option('--resume'):path.join(directory,randomUUID()+'.jsonl');
const sessionId=args.includes('--resume')?JSON.parse(fs.readFileSync(sessionFile,'utf8')).sessionId:randomUUID();
fs.writeFileSync(sessionFile,JSON.stringify({sessionId}));
let model={provider:'fixture',id:'worker'},streaming=false,thinkingLevel:string|undefined='off';
let configurationChanged=false;
let pending: Timer|undefined;
const emit=(frame:unknown)=>process.stdout.write(JSON.stringify(frame)+'\n');
function finish(){streaming=false;emit({type:'agent_end',messages:[]});}
let buffer='';
for await(const data of Bun.stdin.stream()) {
  buffer+=new TextDecoder().decode(data,{stream:true});
  let index:number;
  while((index=buffer.indexOf('\n'))>=0){
    const line=buffer.slice(0,index);buffer=buffer.slice(index+1);if(!line)continue;
    const command=JSON.parse(line);
    fs.appendFileSync(path.join(directory,'commands.log'),JSON.stringify(command)+'\n');
    const respond=(value:unknown={})=>emit({type:'response',id:command.id,command:command.type,success:true,data:value});
    if(command.type==='get_state') {
      if(process.env.FAKE_STARTUP_MARKER) fs.writeFileSync(process.env.FAKE_STARTUP_MARKER,'state requested');
      if(process.env.FAKE_CONFIG_STATE_FAIL && configurationChanged) emit({type:'response',id:command.id,success:false,error:'state unavailable after configuration'});
      else if(!process.env.FAKE_HOLD_STARTUP) respond({model,thinkingLevel,isStreaming:streaming,isCompacting:process.env.FAKE_COMPACT==='1',queuedMessageCount:Number(process.env.FAKE_QUEUED || 0),sessionFile,sessionId,systemPrompt:'PRIVATE_SYSTEM_PROMPT',dumpTools:[{description:'PRIVATE_TOOL_SCHEMA'}]});
    }
    else if(command.type==='set_model'){
      model={provider:command.provider,id:command.modelId==='head' && process.env.FAKE_MODEL_SUBSTITUTE ? 'worker' : command.modelId};respond(model);
    }
    else if(command.type==='set_thinking_level'){
      configurationChanged=true;
      if(command.level==='high' && process.env.FAKE_THINKING_MODE==='reject') emit({type:'response',id:command.id,success:false,error:'thinking rejected'});
      else {thinkingLevel=command.level==='high' && process.env.FAKE_THINKING_MODE==='clamp'?'low':command.level;respond();}
    }
    else if(command.type==='prompt'){
      streaming=true;emit({type:'agent_start'});
      fs.appendFileSync(path.join(directory,'assignments.log'),command.message+'\n');
      fs.appendFileSync(path.join(directory,'routing.log'),JSON.stringify({model,thinkingLevel})+'\n');
      if(command.message==='slow-ack')setTimeout(respond,300);else respond();
      if(command.message==='crash'){process.exit(7);}
      else if(command.message==='malformed'){process.stdout.write('not-json\n');}
      else if(command.message==='blocked'){emit({type:'extension_ui_request',id:'ui-1',method:'confirm',title:'Needs permission'});}
      else if(command.message==='flood')pending=setTimeout(()=>{
        for(let i=0;i<6000;i++)emit({type:'message_update',assistantMessageEvent:{type:['text_delta','thinking_delta','toolcall_delta'][i%3],delta:'PRIVATE_THINKING_OR_PARTIAL'.repeat(30)},message:{role:'assistant',content:[{type:'thinking',thinking:'PRIVATE_THINKING'}]}});
        emit({type:'message_end',message:{role:'assistant',content:[{type:'thinking',thinking:'PRIVATE_THINKING'},{type:'text',text:'Final bounded result '+ 'x'.repeat(20000)}]}});
        finish();
      },75);
      else if(command.message!=='hold')pending=setTimeout(()=>{
        emit({type:'message_end',message:{role:'assistant',content:[{type:'text',text:'Fixture result, not acceptance'}]}});finish();
      },command.message==='slow-ack'?500:75);
    }else if(command.type==='abort'){
      clearTimeout(pending);finish();respond();
    }else if(command.type==='steer'||command.type==='follow_up'){
      emit({type:'message_update',note:command.type,message:command.message});respond();
    }else emit({type:'response',id:command.id,command:command.type,success:false,error:'unsupported fixture command'});
  }
}
process.exit(0);
