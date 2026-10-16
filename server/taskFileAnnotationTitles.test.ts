import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callAnnotationTitleModel } from './annotationTitles.ts';
import { parseAnnotationTitles } from '../src/features/tasks/files/lib/task-file-annotation-titles.ts';
const items = [{ id: 'one', opinion: '去掉', quote: '各阶段都有独立退出条件。任何范围变化需形成新版本；前一阶段的问题不通过放量掩盖。', location: 'p', kind: 'text' as const }];

test('AI summarises the requested action and object, preserving the original source and opinion', async () => {
 const before=JSON.stringify(items);let prompt='';let input:unknown;
 const titles=await callAnnotationTitleModel({locale:'zh-CN',items},{apiKey:'test-only',endpoint:'https://example.test/responses',model:'fixture',maxOutputTokens:1024,timeoutMs:1000},async(_options,instructions,payload)=>{prompt=instructions;input=payload;return {rawOutput:JSON.stringify({titles:[{id:'one',title:'删除阶段退出条件说明'}]}),usage:{inputTokens:null,outputTokens:null,totalTokens:null}};},new AbortController().signal);
 assert.deepEqual(titles,{one:'删除阶段退出条件说明'});assert.equal(JSON.stringify(items),before);assert.deepEqual(input,{locale:'zh-CN',items});assert.match(prompt,/概括/);assert.match(prompt,/不能.*(?:照搬|截取)/);assert.match(prompt,/不.*执行/);
});

test('copied selections, truncated selections, missing IDs and unexpected IDs cannot masquerade as generated titles',()=>{
 for(const titles of [[{id:'one',title:items[0].quote}],[{id:'one',title:'各阶段都有独立退出条件'}],[{id:'one',title:'各阶段都有独立退出…'}],[],[{id:'unknown',title:'删除说明'}],[{id:'one',title:'删除说明'},{id:'one',title:'删除说明'}]])assert.throws(()=>parseAnnotationTitles({titles},items));
 assert.deepEqual(parseAnnotationTitles({titles:[{id:'one',title:'删除阶段退出条件说明'}]},items),{one:'删除阶段退出条件说明'});
});


test('unconfigured models fail before any network request',async()=>{
 await assert.rejects(callAnnotationTitleModel({locale:'zh-CN',items},{endpoint:'https://example.test/responses',model:'fixture',maxOutputTokens:1024,timeoutMs:1000},undefined,new AbortController().signal),/未配置/);
});
