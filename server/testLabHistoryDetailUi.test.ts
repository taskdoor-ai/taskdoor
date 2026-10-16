import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLabClient} from '../src/test-lab/client.ts';

test('历史详情入口将选中 result 编码传入完整 bootstrap，关闭后回摘要路由',async()=>{
  const source=readFileSync(new URL('../tools/evaluation/fork/extensions/RunPage.tsx',import.meta.url),'utf8');
  const deployed=readFileSync(new URL('../tools/evaluation/upstream/src/app/src/extensions/RunPage.tsx',import.meta.url),'utf8');
  assert.equal(deployed,source,'实际挂载副本必须同步');
  const detailLink=source.match(/<Link reloadDocument to=\{([^}]+)\}>步骤与验收<\/Link>/);
  assert.ok(detailLink,'进入详情需重新加载带 result 的完整结果路由，不能直接展开被裁剪的摘要');
  const runId='run:隔离 /?&=1';
  const href=Function('r',`return (${detailLink[1]});`)({id:runId});
  const url=new URL(href,'http://test.local');
  assert.equal(url.pathname,'/history');
  assert.equal(url.searchParams.get('result'),runId);
  assert.equal(url.searchParams.has('batch'),false,'只展开选中运行，不顺带读取完整批次');
  const requests:string[]=[];
  const client=createLabClient('',async input=>{
    requests.push(String(input));
    return new Response(JSON.stringify({state:{runs:[]}}),{status:200,headers:{'Content-Type':'application/json'}});
  });
  await client.bootstrap({result:url.searchParams.get('result')!});
  assert.equal(requests.length,1);
  const request=new URL(requests[0],'http://test.local');
  assert.equal(request.pathname,'/api/test-lab/bootstrap');
  assert.equal(request.searchParams.get('result'),runId);
  assert.equal(request.searchParams.has('batch'),false);
  const provider=readFileSync(new URL('../tools/evaluation/fork/extensions/shared.tsx',import.meta.url),'utf8');
  assert.match(provider,/const result=query\.get\('result'\)\?\?undefined/);
  assert.match(provider,/client\.bootstrap\(\{.*result\?\{result\}:\{\}/);
  assert.match(source,/setDetail\(null\);setBatch\(''\);setNote\(''\);navigate\('\/history',\{replace:true\}\)/);
  assert.match(source,/这条运行记录不存在或当前无法读取/);
  assert.doesNotMatch(source,/setDetail\(r\.id\)/);
});
