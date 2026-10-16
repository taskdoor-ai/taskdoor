import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import SubtaskSuggestionsPreview from '../tools/evaluation/fork/extensions/SubtaskSuggestionsPreview.tsx';
import {seedLab} from './test-lab/seeds.ts';
import {buildSubtaskCases} from './test-lab/subtask-cases.ts';
import {buildSubtaskInput} from './test-lab/subtask-suggestions.ts';
import type {LabRun} from '../src/test-lab/types.ts';

test('实际评测界面平铺展示候选的真实目标、标准、建议日期及只读边界',()=>{
  const item=buildSubtaskCases(seedLab().teams[0])[0],team=item.dataSnapshot!,input=buildSubtaskInput(team,item,item.steps[0],'ui');
  const output={schemaVersion:'taskdoor.subtask-suggestions.v1',parentTaskId:input.currentTask.id,status:'ready',summary:'仅补商城图',suggestions:[{clientId:'image',title:'制作商城图',goal:'帮助访客理解容量和清洁方式以支持选购。',acceptanceCriteria:['交付一张商城图，信息与已确认资料一致。'],ownerMemberId:null,participants:[],dueDate:'2026-10-19',rationale:'文案已有任务覆盖，只补图。',sourceRefs:[input.currentTask.sourceId]}],coveredByExisting:[],contextGaps:[],questions:[],warnings:['日期为建议，可修改或清空。']};
  const step={stepId:'s1',skillId:'taskdoor-decompose-task',input,output,structure:'passed',skillHash:'hash'};
  const run={teamSnapshot:team,steps:[step]} as unknown as LabRun;
  const html=renderToStaticMarkup(React.createElement(SubtaskSuggestionsPreview,{run}));
  for(const expected of ['查看一层子任务建议','帮助访客理解容量和清洁方式','交付一张商城图','2026-10-19','不代表已创建或已分配','只补图'])assert.ok(html.includes(expected),expected);
  assert.ok(!html.includes('燃起图'));
});

test('真实 /setup 与团队用例页保留独立 Skill 和执行方式，不套用创建树',()=>{
  const setup=readFileSync(new URL('../tools/evaluation/fork/extensions/RunPage.tsx',import.meta.url),'utf8');
  const cases=readFileSync(new URL('../tools/evaluation/fork/extensions/CasesPage.tsx',import.meta.url),'utf8');
  assert.match(setup,/decomposing\?'subtasks'/);assert.match(setup,/availableSubtaskSuggestionsCases/);assert.match(setup,/isSubtaskSuggestionsSnapshot/);
  assert.match(cases,/<option value="taskdoor-decompose-task">子任务拆解<\/option>/);assert.match(cases,/taskdoor-decompose-task","agentdoor-task-status-analyzer","agentdoor-member-matcher/);
});
