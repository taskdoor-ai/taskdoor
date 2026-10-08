import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import type { LabRun } from '../../src/test-lab/types.ts';

export type EvaluationEngine = {
  check():void;
  run(runs:LabRun[],execute:(id:string)=>Promise<LabRun>,onEval:(id:string,completed?:number)=>void):Promise<void>;
  close():void;
};

// Promptfoo schedules case/model combinations. TaskDoor retains the permission-aware,
// multi-turn case adapter and is the only writer of its own state file.
export function createPromptfooEngine(root:string,configDir=resolve(root,'data/test-lab/promptfoo')):EvaluationEngine {
  let node:string|undefined;
  const children=new Set<ChildProcess>();
  return {
    check(){
      node??=[process.env.EVALUATION_NODE,process.execPath,resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')].filter((p):p is string=>!!p).find(p=>{
        if(!existsSync(p))return false;
        const [major,minor]=spawnSync(p,['--version'],{encoding:'utf8'}).stdout?.trim().slice(1).split('.').map(Number)??[];
        return major>22||major===22&&minor>=22;
      });
      if(!node)throw new Error('评测引擎需要 Node >=22.22，请设置 EVALUATION_NODE');
      if(!existsSync(resolve(root,'tools/evaluation/node_modules/promptfoo/dist/src/index.js')))throw new Error('请先 npm install --prefix tools/evaluation 安装评测引擎');
    },
    async run(runs,execute,onEval){
      this.check();
      await new Promise<void>((accept,reject)=>{
        const child=spawn(node!,[resolve(root,'tools/evaluation/worker.mjs')],{cwd:root,stdio:['ignore','ignore','pipe','ipc'],env:{...process.env,PROMPTFOO_CONFIG_DIR:configDir,PROMPTFOO_DISABLE_TELEMETRY:'1',PROMPTFOO_DISABLE_UPDATE:'1',PROMPTFOO_DISABLE_REMOTE_GENERATION:'1'}});
        children.add(child);
        const allowed=new Set(runs.map(r=>r.id));
        const executed=new Map<string,Promise<LabRun>>();
        let done=false;
        child.on('error',reject);
        child.on('message',async(message:any)=>{
          if(message.type==='execute'&&allowed.has(message.id)){
            // Provider retries must never duplicate a paid model call.
            let pending=executed.get(message.id);
            if(!pending){pending=execute(message.id);executed.set(message.id,pending);}
            try{const run=await pending;if(child.connected)child.send({type:'result',id:message.id,run});}
            catch{if(child.connected)child.send({type:'result',id:message.id,error:'TaskDoor 执行适配器失败'});}
          }else if(message.type==='evaluation'&&typeof message.id==='string'&&/^eval-[\w.:-]+$/.test(message.id))onEval(message.id,Number.isInteger(message.completed)?message.completed:undefined);
          else if(message.type==='done')done=true;
        });
        // Do not relay third-party error output: provider payloads may contain private inputs.
        child.stderr?.resume();
        child.on('exit',code=>{children.delete(child);done&&code===0?accept():reject(new Error('Promptfoo 执行进程中断；已完成的业务结果保留，请检查评测引擎安装与本机数据库。'));});
        child.send({type:'start',runs:runs.map(r=>({id:r.id,caseId:r.caseId,caseName:r.caseName,batchId:r.batchId,model:r.model,skillVersionId:r.skillVersionId,skillVersionNumber:r.skillVersionNumber,team:r.teamSnapshot.name,actor:r.teamSnapshot.members.find(m=>m.id===r.actorId)?.name??r.actorId,steps:r.caseSnapshot.steps.map(s=>({id:s.id,message:s.prompt}))}))});
      });
    },
    close(){for(const child of children)child.kill();},
  };
}
