import test from 'node:test';
import assert from 'node:assert/strict';
import {callModel,ModelResponseError} from './test-lab/model.ts';
const options={apiKey:'test',endpoint:'https://example.com/responses',model:'deepseek/deepseek-v4.1-flash',maxOutputTokens:16000,timeoutMs:1000};
test('DeepSeek uses a supported low reasoning effort while other models retain their setting',async()=>{
 for(const model of [options.model,'qwen/qwen3.6-plus'])await callModel({...options,model},'instructions',{},new AbortController().signal,async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  assert.equal(body.reasoning.effort,model===options.model?'low':'medium');
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{}'}]}]});
 });
});
test('Token exhaustion reports reasoning usage and preserves the partial answer without retry',async()=>{
 let calls=0;
 await assert.rejects(()=>callModel(options,'instructions',{},new AbortController().signal,async()=>{
  calls++;return Response.json({status:'incomplete',incomplete_details:{reason:'max_output_tokens'},usage:{input_tokens:100,output_tokens:16000,output_tokens_details:{reasoning_tokens:15900}},output:[{content:[{type:'output_text',text:'{"partial":'}]}]});
 }),e=>e instanceof ModelResponseError&&e.message.includes('16000')&&e.message.includes('15900')&&e.response.rawOutput==='{"partial":');
 assert.equal(calls,1);
});
test('A non-budget incomplete response is not mislabeled as token exhaustion',async()=>{
 await assert.rejects(()=>callModel(options,'instructions',{},new AbortController().signal,async()=>Response.json({status:'incomplete',incomplete_details:{reason:'content_filter'},output:[]})),e=>e instanceof ModelResponseError&&!e.message.includes('输出上限'));
});

test('Claude uses the gateway chat endpoint and retains usage',async()=>{
 const response=await callModel({apiKey:'test',endpoint:'https://example.com/v1/responses',model:'pa/claude-sonnet-4-6',maxOutputTokens:8000,timeoutMs:1000},'judge',{},new AbortController().signal,async(url,init)=>{
  assert.equal(String(url),'https://example.com/v1/chat/completions');const body=JSON.parse(String(init?.body));assert.equal(body.max_tokens,8000);assert.equal(body.messages[0].role,'system');
  return Response.json({choices:[{finish_reason:'stop',message:{content:'{"items":[]}'}}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}});
 });assert.equal(response.usage.inputTokens,10);assert.equal(response.usage.outputTokens,5);assert.equal(response.rawOutput,'{"items":[]}');
});
