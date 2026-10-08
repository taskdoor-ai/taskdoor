// Reapply maintained TaskDoor customizations to the pinned upstream frontend.
import {readFileSync,writeFileSync,copyFileSync,readdirSync,cpSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from '@babel/parser';
const here=dirname(fileURLToPath(import.meta.url));
const app=resolve(here,'../upstream/src/app');
for(const file of ['App.tsx','taskdoor.css'])copyFileSync(resolve(here,file),resolve(app,'src',file));
copyFileSync(resolve(here,'vite.config.mjs'),resolve(app,'vite.config.mjs'));
for(const file of ['Navigation.tsx','PageShell.tsx'])copyFileSync(resolve(here,file),resolve(app,'src/components',file));
cpSync(resolve(here,'extensions'),resolve(app,'src/extensions'),{recursive:true});
const view=resolve(app,'src/pages/eval/components/ResultsView.tsx');
let source=readFileSync(view,'utf8');
const start=source.indexOf('  const evalActionsMenuItems = (');const end=source.indexOf('\n  return (',start);
if(start<0||end<0)throw new Error('Upstream action menu changed; inspect before patching');
source=source.slice(0,start)+`  const evalActionsMenuItems = (<>
 <CompareEvalMenuItem onClick={() => setCompareDialogOpen(true)} />
 <DownloadMenuItem onClick={() => setDownloadDialogOpen(true)} />
 </>);\n`+source.slice(end);
writeFileSync(view,source);
// Translate source UI literals only; never mutate rendered user/model content.
const dictionary=JSON.parse(readFileSync(resolve(here,'zh-CN.json'),'utf8'));
function walk(dir){for(const name of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,name.name);if(name.isDirectory())walk(path);else if(/\.tsx?$/.test(name.name)){
const text=readFileSync(path,'utf8');let ast;try{ast=parse(text,{sourceType:'module',plugins:['typescript',...(path.endsWith('tsx')?['jsx']:[])]});}catch{continue;}const edits=[];
function visit(node,parent){
 if(!node||typeof node!=='object')return;
 if(node.type==='JSXText'){const raw=node.value;const key=raw.replace(/\s+/g,' ').trim();if(dictionary[key])edits.push([node.start,node.end,raw.replace(/\S[\s\S]*\S|\S/,dictionary[key])]);}
 else if(node.type==='StringLiteral'&&dictionary[node.value]){
 const allowed=(path.endsWith('FilterModeSelector.tsx')&&parent?.type==='ObjectProperty'&&parent.value===node)||parent?.type==='JSXAttribute'||parent?.type==='JSXExpressionContainer'||parent?.type==='ObjectProperty'&&parent.value===node&&['label','title','description','placeholder','header','tooltip','name'].includes(parent.key.name??parent.key.value);
 if(allowed)edits.push([node.start,node.end,JSON.stringify(dictionary[node.value])]);
 }
 for(const [key,value]of Object.entries(node)){if(['loc','comments','tokens','extra'].includes(key))continue;if(Array.isArray(value))value.forEach(child=>visit(child,node));else if(value&&typeof value==='object'&&value.type)visit(value,node);}
}
visit(ast,null);if(edits.length){edits.sort((a,b)=>b[0]-a[0]);let out=text;for(const [a,b,value]of edits)out=out.slice(0,a)+value+out.slice(b);writeFileSync(path,out);}
}}}walk(resolve(app,'src'));

const html=resolve(app,'index.html');writeFileSync(html,readFileSync(html,'utf8').replace('lang="en"','lang="zh-CN"').replace('<title>promptfoo</title>','<title>TaskDoor · Skill 评测平台</title>'));
const header=resolve(app,'src/pages/eval/components/EvalHeader.tsx');writeFileSync(header,readFileSync(header,'utf8').replace(/<AuthorChip[\s\S]*?\/>/g,''));
function patch(relative,fn){const p=resolve(app,'src',relative);writeFileSync(p,fn(readFileSync(p,'utf8')));}
patch('pages/eval/components/store.ts',s=>s.replace('renderMarkdown: false','renderMarkdown: true').replace('showInferenceDetails: true','showInferenceDetails: false').replace('stickyHeader: true','stickyHeader: false').replace('showMetricPills: true','showMetricPills: false').replace('maxTextLength: 250','maxTextLength: 1600').replace("name: 'eval-settings'","name: 'taskdoor-eval-settings-v1'"));
patch('pages/eval/components/ResultsView.tsx',s=>s.replace('hiddenVarNamesBySchema[schemaHash] ?? []',"hiddenVarNamesBySchema[schemaHash] ?? ['需求','预期','caseId','团队','操作人']").replace("'Hide Charts' : 'Show Charts'","'隐藏图表' : '显示图表'"));
patch('pages/eval/components/ResultsTable.tsx',s=>s.replace(/\{resourceId && \([\s\S]*?\n          \)\}/,'').replaceAll('% passing','% 自动通过').replaceAll(' cases)',' 条用例)').replaceAll(' passed',' 已通过').replaceAll(' filtered,',' 筛选结果，').replaceAll(' total)',' 总计)').replaceAll('>Asserts:<','>断言：<').replaceAll('>Total Tokens:<','>总 Token：<').replaceAll('>Provider Tokens:<','>模型 Token：<').replaceAll('>Avg Tokens:<','>平均 Token：<').replaceAll('>Avg Latency:<','>平均耗时：<').replaceAll('>Tokens/Sec:<','>Token/秒：<').replaceAll('>Errors:<','>错误：<'));
patch('pages/eval/components/hooks.ts',s=>s.includes('(prompt.metrics?.testErrorCount ?? 0);')?s:s.replaceAll('(prompt.metrics?.testFailCount ?? 0);','(prompt.metrics?.testFailCount ?? 0) + (prompt.metrics?.testErrorCount ?? 0);').replaceAll('(filteredMetrics[idx].testFailCount ?? 0)','(filteredMetrics[idx].testFailCount ?? 0) + (filteredMetrics[idx].testErrorCount ?? 0)'));
patch('pages/eval/components/EvalOutputCell.tsx',s=>s.replace("return 'ERROR';","return '错误';").replaceAll(' FAIL`',' 未通过`').replaceAll(' PASS`',' 通过`').replaceAll("? 'FAIL'","? '未通过'").replaceAll("? 'PASS'","? '通过'"));
patch('pages/eval/components/EvalHeader.tsx',s=>s.replace("toLocaleDateString('en-US'","toLocaleDateString('zh-CN'"));
patch('components/ui/search-input.tsx',s=>s.replace("placeholder = 'Search...'","placeholder = '搜索输出…'"));
patch('hooks/usePageMeta.ts',s=>s.replaceAll('| promptfoo','| TaskDoor 评测'));
patch('pages/eval/components/ResultsView.tsx',s=>s.replace('label: `Var ${idx + 1}: ${','label: `输入 ${idx + 1}：${'));
patch('pages/eval/components/HiddenColumnChips.tsx',s=>s.replace('title={`Show ${column.label}`}','title={`显示 ${column.label}`}'));
// Manual business acceptance has one source of truth in TaskDoor. Keep native detail/copy,
// but remove score overrides that would otherwise alter automatic pass counts.
patch('pages/eval/components/EvalOutputCell.tsx',s=>{
 const marker=s.indexOf('aria-label={passActionLabel}');
 if(marker<0)return s;
 const start=s.lastIndexOf('<Tooltip disableHoverableContent>',marker);
 const end=s.indexOf('{output.prompt && (',marker);
 return start>=0&&end>start?s.slice(0,start)+s.slice(end):s;
});
patch('pages/eval/components/ResultsView.tsx',s=>s.replace('table.body?.some((row) => row.description)','table.body?.some((row) => row.test?.description)').replace("['需求','预期','caseId','团队','操作人']","['用例','需求','预期','caseId','团队','操作人']").replace('savedState?.columnVisibility[col] ?? true',"savedState?.columnVisibility[col] ?? (col !== 'description')"));
patch('pages/eval/components/ResultsTable.tsx',s=>s.replace('const PROMPT_COLUMN_SIZE_PX = 480','const PROMPT_COLUMN_SIZE_PX = 420').replace(/(?<!<\/div>)<EvalOutputCell\n/,'<div className="taskdoor-case-label">{info.row.original.test?.description}</div><EvalOutputCell\n'));

patch('pages/evals/page.tsx',s=>s.replace(/deletionEnabled(?:=\{false\})*/g,'deletionEnabled={false}'));

patch('utils/date.ts',s=>s.replaceAll("toLocaleDateString('en-US'","toLocaleDateString('zh-CN'"));
patch('pages/evals/components/EvalsTable.tsx',s=>s.replace('setEvals(body.data);','setEvals(body.data.filter(row => row.numTests > 0));'));

// The fork uses a sidebar: native eval index must stay inside the main column.
patch('pages/evals/page.tsx',s=>s.replace('fixed top-[calc(var(--nav-height)+var(--update-banner-height,0px))] left-0 right-0 bottom-0 flex flex-col overflow-hidden min-h-0','eval-index-page flex flex-col overflow-hidden min-h-0'));

// Reuse the project's final brand mark for the application and browser tab.
writeFileSync(resolve(app,'public/taskdo-mark.svg'),readFileSync(resolve(here,'../../../brand/agentdoor-logo-final.svg'),'utf8').replace('currentColor','#285de5').replace('<title id="title">TaskDoor</title>','<title id="title">TaskDo</title>'));
writeFileSync(html,readFileSync(html,'utf8').replace(/<title>[^<]*<\/title>/,'<title>TaskDo 自动化评测系统</title>').replace(/<link rel="icon"[^>]*>/,'<link rel="icon" type="image/svg+xml" href="/taskdo-mark.svg" />').replace('https://www.promptfoo.dev/img/thumbnail.png','/taskdo-mark.svg').replace('LLM testing and evaluation','TaskDo 自动化评测系统'));
patch('hooks/usePageMeta.ts',s=>s.replaceAll('| TaskDoor 评测','| TaskDo 自动化评测系统'));
