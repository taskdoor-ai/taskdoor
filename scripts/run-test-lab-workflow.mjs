import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const escapeXml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function toJUnit(report){
  const failed=report.rows.filter(r=>r.automatic==='failed'||r.review==='failed');
  const skipped=report.rows.filter(r=>!failed.includes(r)&&(r.automatic!=='passed'||r.review==='pending'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="TaskDoor workflow" tests="${report.rows.length}" failures="${failed.length}" skipped="${skipped.length}">\n${report.rows.map(row=>`  <testcase name="${escapeXml(row.name)}" classname="${escapeXml(report.workflowId)}">${failed.includes(row)?`<failure message="${escapeXml(row.error||row.failures.join('；')||'人工核对未通过')}">${escapeXml(JSON.stringify(row.steps))}</failure>`:skipped.includes(row)?`<skipped message="${escapeXml(row.automatic==='passed'?'自动检查通过，等待人工核对':'执行未完成或结果未知')}"/>`:''}</testcase>`).join('\n')}\n</testsuite>\n`;
}
export const reportExitCode=report=>report.verdict==='passed'?0:report.verdict==='failed'?1:2;
export async function main(args=process.argv.slice(2)){
  const {values}=parseArgs({args,options:{list:{type:'boolean'},run:{type:'boolean'},check:{type:'boolean'},help:{type:'boolean'},workflow:{type:'string'},team:{type:'string'},flow:{type:'string'},model:{type:'string'},origin:{type:'string',default:'http://127.0.0.1:5173'},out:{type:'string'},batch:{type:'string'},timeout:{type:'string',default:'1200'},'request-id':{type:'string'}}});
  if(values.help||!values.list&&!values.workflow&&!values.team&&!values.batch){console.log('列出流程：npm run lab:workflow -- --list\n资料预检：npm run lab:workflow -- --team lab-manufacturing --flow delivery --check\n真实运行：npm run lab:workflow -- --team lab-manufacturing --flow delivery --run --model <模型ID>\n读取已有批次：npm run lab:workflow -- --batch <批次ID>\n可选：--out <报告目录> --timeout <秒> --request-id <幂等请求ID>\n默认仅预检，不调用模型。真实运行导出 JSON 和 JUnit；退出码 0=通过，1=失败，2=待人工核对/未知/未完成。');return 0;}
  if(values.run&&values.check)throw new Error('--run 与 --check 不能同时使用');
  const origin=new URL(values.origin);
  if(origin.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(origin.hostname)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('仅支持本机 HTTP 测试平台地址');
  const timeout=Number(values.timeout);if(!Number.isFinite(timeout)||timeout<1||timeout>3600)throw new Error('timeout 需为 1–3600 秒');
  let token='';
  async function request(path,body){const response=await fetch(new URL('/api/test-lab'+path,origin),{method:body?'POST':'GET',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json',Origin:origin.origin,'x-test-lab-csrf':token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),redirect:'error'});const data=await response.json();if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);return data;}
  const bootstrap=await request('/bootstrap');token=bootstrap.csrfToken;
  if(values.list){const workflows=await request('/workflows');for(const flow of workflows)console.log(`${flow.id}\t${flow.caseIds.length} 个场景\t${flow.title}`);return 0;}
  const out=resolve(values.out||'data/test-lab/reports');await mkdir(out,{recursive:true});
  let batchId=values.batch;
  if(!batchId){
    const workflowId=values.workflow||`${values.team}::${values.flow||'delivery'}`;
    const checked=await request('/workflows/check',{workflowId});
    const file=join(out,`${workflowId.replace(/[^\p{L}\p{N}_.-]/gu,'_')}-preflight.json`);
    await writeFile(file,JSON.stringify({kind:'preflight',modelCalled:false,...checked},null,2));
    console.log(`${checked.ready?'预检通过':'预检未通过'}：${checked.workflow.title}，${checked.cases.length} 个场景 / ${checked.stepCount} 个步骤。\n预检报告：${file}`);
    if(!checked.ready){for(const item of checked.cases)for(const check of item.checks.filter(c=>c.status==='failed'))console.log(`- ${item.name} / ${check.label}：${check.message}`);return 1;}
    if(!values.run){console.log('仅检查初始条件，未调用模型。添加 --run 执行真实模型测试。');return 0;}
    const requestId=values['request-id']||randomUUID();
    console.log(`请求 ID：${requestId}（提交结果不确定时使用同一 ID 重试，避免重复运行）`);
    const selection={workflowId,...(values.model?{model:values.model}:{})};
    await writeFile(join(out,`${requestId.replace(/[^a-zA-Z0-9_.-]/g,'_')}-request.json`),JSON.stringify({requestId,caseIds:checked.workflow.caseIds,selection},null,2));
    const runs=await request('/runs',{caseIds:checked.workflow.caseIds,requestId,selection});batchId=runs[0].batchId;
    console.log(`批次 ID：${batchId}；后台自动依次执行。`);
  }
  const deadline=Date.now()+timeout*1000;
  let report;
  while(true){
    report=await request('/workflow-report?'+new URLSearchParams({batchId}));
    await writeFile(join(out,`${batchId}-report.json`),JSON.stringify(report,null,2));
    await writeFile(join(out,`${batchId}-junit.xml`),toJUnit(report));
    if(report.verdict!=='running')break;
    if(Date.now()>=deadline){console.log(`等待超时，后台批次仍可能运行；使用 --batch ${batchId} 查看后续结果。`);return 2;}
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  console.log(`结果：${report.verdict}；自动通过 ${report.counts.passed}，失败 ${report.counts.failed}，未知/未完成 ${report.counts.unknown}，待人工核对 ${report.counts.reviewPending}。\n报告：${join(out,`${batchId}-report.json`)}`);
  return reportExitCode(report);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().then(code=>{process.exitCode=code;}).catch(error=>{console.error(error.message);process.exitCode=1;});
