import createdProgress from '../src/i18n/mock/createdProgress.json';
import createdTasks from '../src/i18n/mock/createdTasks.json';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import records from '../src/data/taskProgressDemoRecords.json';
import copies from '../src/i18n/mock/progressRecords.json';
import catalog from '../src/i18n/mock/progressCopy.json';
import { mockRecordText, mockTaskCatalog } from '../src/i18n/mockContent';
import { progressText } from '../src/i18n/progressCopy';
import { layoutBurnUpDateAxis } from '../src/components/TaskBurnUpTiming';
import { TaskProgressComparison } from '../src/components/TaskProgressComparison';
import { MockTaskProvider } from '../src/i18n/MockDataProvider';
import { getTaskProgressDemoExample } from '../src/data/taskProgressDemo';
import { getTaskProgressDisplay } from '../src/lib/taskProgressDisplay';
(globalThis as typeof globalThis & {React: typeof React}).React = React;

test('all seeded progress evidence has English copies and preserves edits', () => {
  function walk(value: unknown, id: string) {
    if (Array.isArray(value)) return value.forEach(item => walk(item,id));
    if (!value || typeof value !== 'object') return;
    for (const [key, text] of Object.entries(value)) {
      if (['basis','timingBasis','note'].includes(key) && typeof text === 'string') {
        const result = mockRecordText('en',id,text);
        assert.ok(!/[\u4e00-\u9fff]/.test(result), id+': '+text);
        assert.equal(mockRecordText('zh-CN',id,text),text);
        assert.equal(mockRecordText('en',id,text+'用户追加备注'),text+'用户追加备注');
      } else walk(text,id);
    }
  }
  for (const [id,record] of Object.entries(records)) walk(record,id);
  for (const [id,list] of Object.entries(copies)) for (const copy of list) {
    assert.ok(!/[\u4e00-\u9fff]/.test(copy.en), id);
  }
});
test('progress copy has matching interpolation and translates date deltas and units', () => {
  for (const copy of Object.values(catalog)) assert.deepEqual(copy.zh.match(/\{\d+\}/g)?.sort() ?? [], copy.en.match(/\{\d+\}/g)?.sort() ?? []);
  assert.equal(progressText('en','预计延期 16 天'),'Expected 16 days late');
  assert.equal(progressText('en','+1 天'),'+1 day');
  assert.equal(progressText('en','Total work 1 人天'),'Total work 1 person-day');
  assert.equal(progressText('zh-CN','预计延期 16 天'),'预计延期 16 天');
  assert.equal(progressText('en','用户自定的分析内容'),'用户自定的分析内容');
});
test('localized chart labels are measured before layout and preserve date positions', () => {
  const series=getTaskProgressDemoExample('fragrance-content')!;
  const model=getTaskProgressDisplay({series});
  const input={model,start:'2026-08-25',end:'2026-09-15',asOf:'2026-09-14',startX:20,endX:400,asOfX:380,dueX:400,finishX:400};
  const zh=layoutBurnUpDateAxis(input),en=layoutBurnUpDateAxis({...input,translate:value=>progressText('en',value)});
  assert.deepEqual(en.labels.filter(x=>x.entries.some(e=>e.kind!=='tick')).map(x=>[x.date,x.x]),zh.labels.filter(x=>x.entries.some(e=>e.kind!=='tick')).map(x=>[x.date,x.x]));
  assert.ok(en.labels.every(x=>x.entries.every(e=>!/[\u4e00-\u9fff]/.test(e.label))));
});
test('rendered built-in chart is English and leaves its numerical evidence unchanged', () => {
  const id='fragrance-content',series=getTaskProgressDemoExample(id)!; const before=structuredClone(series);
  const html=renderToStaticMarkup(React.createElement(MockTaskProvider,{taskId:id},React.createElement(TaskProgressComparison,{compact:true,series})));
  assert.match(html,/Mostly complete/); assert.match(html,/Burn-up chart/);
  assert.doesNotMatch(html.replace(/ data-[\w-]+="[^"]*"/g,''),/[\u4e00-\u9fff]/);
  assert.deepEqual(series,before);
  const text=`「${mockTaskCatalog[id].title.zh}」进行中；AI 预测完成度 80%。AI 预测完成日 2026-09-15；预计延期 16 天。`;
  assert.doesNotMatch(progressText('en',text,0,value=>mockRecordText('en',id,value)),/[\u4e00-\u9fff]/);
});

test('saved creation demo progress translates without replacing edited notes', () => {
  const id='saved-demo-child', additional={[id]:createdTasks[1]};
  for (const copy of createdProgress) {
    assert.equal(mockRecordText('en',id,copy.zh,additional),copy.en);
    assert.equal(mockRecordText('en',id,copy.zh+'我的补充',additional),copy.zh+'我的补充');
  }
});
