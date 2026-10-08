// Fetch a pinned upstream source tree, then apply local UI patches. No npm package edits.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,existsSync,mkdirSync,cpSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),dest=resolve(here,'../upstream');
const source=mkdtempSync(join(tmpdir(),'taskdoor-promptfoo-src-'));
execFileSync('git',['clone','--depth','1','--branch','0.123.1','--filter=blob:none','--sparse','https://github.com/promptfoo/promptfoo.git',source],{stdio:'inherit'});
const revision=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(revision!=='34f74d34e140b5e17d23770dfb2340057b1936b8')throw new Error('Upstream tag differs from reviewed revision');
execFileSync('git',['-C',source,'sparse-checkout','set','src'],{stdio:'inherit'});
mkdirSync(dest,{recursive:true});
cpSync(resolve(source,'src'),resolve(dest,'src'),{recursive:true,filter:p=>!/(?:\.test\.|\.stories\.|__tests__|__benchmarks__)/.test(p)});
for(const f of ['LICENSE','package.json'])copyFileSync(resolve(source,f),resolve(dest,f));
for(const f of ['package.json','package-lock.json'])copyFileSync(resolve(here,f),resolve(dest,'src/app',f));
await import('./customize.mjs');
console.log('源码和补丁已准备。请 npm ci --prefix tools/evaluation/upstream/src/app --ignore-scripts');
