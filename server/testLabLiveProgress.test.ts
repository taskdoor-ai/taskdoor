import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ComparisonReport} from '../src/test-lab/comparison.tsx';
import {seedLab} from './test-lab/seeds.ts';
import type {LabRun} from '../src/test-lab/types.ts';
const state=seedLab();
function run(status:LabRun['status'],id:string):LabRun {
 return {id,batchId:'batch',requestId:'request',caseId:id,caseName:`场景 ${id}`,actorId:'actor',teamId:state.teams[0].id,status,createdAt:new Date().toISOString(),startedAt:status==='queued'?null:new Date(Date.now()-12000).toISOString(),finishedAt:null,model:'real-model',endpoint:'https://example.com/responses',caseSnapshot:{...state.cases[0],id},teamSnapshot:state.teams[0],steps:[],error:null,review:null};
}
test('等待模型时显示真实运行状态和当前需求，不把耗时显示为零',()=>{
 const html=renderToStaticMarkup(React.createElement(ComparisonReport,{runs:[run('running','a'),run('queued','b')],onOpenRun:()=>{}}));
 assert.match(html,/执行进度/);
 assert.match(html,/运行中 1/);
 assert.match(html,/排队 1/);
 assert.match(html,/本用例已运行/);
 assert.match(html,/等待模型返回/);
 assert.doesNotMatch(html,/0\.0 秒/);
 assert.match(html,/尚无已结束调用/);
});
test('失败批次明确显示失败和原因，不把结束当成功',()=>{
 const failed=run('failed','c');failed.error='模型服务返回 HTTP 400';
 const html=renderToStaticMarkup(React.createElement(ComparisonReport,{runs:[failed],onOpenRun:()=>{}}));
 assert.match(html,/失败 1/);
 assert.match(html,/模型服务返回 HTTP 400/);
 assert.match(html,/已结束 1 \/ 1/);
});
