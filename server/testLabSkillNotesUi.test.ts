import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {seedLab} from './test-lab/seeds.ts';
import {SkillManager} from '../src/test-lab/management.tsx';
import {RunCenter} from '../src/test-lab/run-center.tsx';
import {CaseEditorFields} from '../src/test-lab/editors.tsx';
import {createLabClient} from '../src/test-lab/client.ts';
import type {LabBootstrap} from '../src/test-lab/types.ts';

test('版本列表、用例选版与运行前摘要均呈现本版优化内容',()=>{
  const state=seedLab();
  const item=state.cases.find(item=>item.enabled&&!item.archived&&item.steps.every(step=>step.skillId==='agentdoor-task-planner'&&!step.taskId))!;
  assert.ok(item);
  const notes='目标描述真实改变；完成标准可核对；持续工作不强加截止。';
  state.skillVersions=[{id:'v15',skillId:'agentdoor-task-planner',label:'创建 v15',notes,snapshot:'# frozen',hash:'frozen-hash',createdAt:'2026-10-16T00:00:00Z'}];
  state.skillDefaults={'agentdoor-task-planner':'v15'};
  const bootstrap:LabBootstrap={state,csrfToken:'unused',skills:[{id:'agentdoor-task-planner',title:'创建任务',outputVersion:'taskdoor.task-preview.v1'}],config:{configured:true,model:'test',endpoint:'https://example.invalid',maxBatchSize:1000,maxOutputTokens:16000,timeoutMs:600000,storage:'test'}};
  const client=createLabClient('',async()=>{throw Error('静态呈现不得调用网络');});
  const manager=renderToStaticMarkup(React.createElement(SkillManager,{bootstrap,client,onSave:()=>{}}));
  assert.ok(manager.includes(`创建 v15 · ${notes}`));
  const editor=renderToStaticMarkup(React.createElement(CaseEditorFields,{value:item,teams:state.teams,skills:bootstrap.skills,versions:state.skillVersions,defaults:state.skillDefaults,onChange:()=>{}}));
  assert.ok(editor.includes(notes));
  const run=renderToStaticMarkup(React.createElement(RunCenter,{bootstrap,client,onRefresh:async()=>{},seed:{id:'test',caseIds:[item.id]}}));
  assert.ok(run.includes('本次 Skill 版本'));assert.ok(run.includes(notes));assert.ok(run.includes('创建 v15'));
});
