import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {toPromptfoo} from './bridge.mjs';
import {invoke,root} from './cli.mjs';
const state=JSON.parse(readFileSync(resolve(root,'data/test-lab/state.json'),'utf8'));
const batch=process.argv[2]??state.runs.at(-1)?.batchId;
const runs=state.runs.filter(r=>r.batchId===batch);
const data=toPromptfoo(runs);
// Each import is an immutable snapshot; never overwrite viewer review comments.
const fingerprint=createHash('sha256').update(JSON.stringify(runs)).digest('hex').slice(0,8);
data.evalId+=`-${fingerprint}`;
const folder=resolve(root,'data/test-lab/promptfoo-imports');mkdirSync(folder,{recursive:true});
const file=resolve(folder,`${data.evalId}.json`);writeFileSync(file,JSON.stringify(data));
await invoke(['import',file]);
console.log(`真实步骤结果 ${data.results.results.length} 条；没有发起新的模型调用。`);
console.log(`http://127.0.0.1:15500/eval/${data.evalId}`);
