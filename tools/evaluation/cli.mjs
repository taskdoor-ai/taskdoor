import {spawnSync,spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
export const root=resolve(here,'../..');
export function invoke(args){
 const candidates=[process.env.EVALUATION_NODE,process.execPath,resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')].filter(Boolean);
 const node=candidates.find(path=>{if(!existsSync(path))return false;const version=spawnSync(path,['--version'],{encoding:'utf8'}).stdout?.trim().slice(1).split('.').map(Number);return version&&(version[0]>22||version[0]===22&&version[1]>=22);});
 if(!node)throw new Error('Promptfoo 需要 Node >=22.22；请用 EVALUATION_NODE 指定该版本的可执行文件。');
 const entry=resolve(here,'node_modules/promptfoo/dist/src/entrypoint.js');
 if(!existsSync(entry))throw new Error('请先 npm install --prefix tools/evaluation');
 const child=spawn(node,['--import',resolve(here,'local-only.mjs'),entry,...args],{cwd:root,stdio:'inherit',env:{...process.env,PROMPTFOO_CONFIG_DIR:resolve(root,'data/test-lab/promptfoo'),PROMPTFOO_DISABLE_TELEMETRY:'1',PROMPTFOO_DISABLE_UPDATE:'1'}});
 return new Promise((accept,reject)=>{child.on('error',reject);child.on('exit',code=>code===0?accept():reject(new Error(`Promptfoo 退出码 ${code}`)));});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))invoke(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
