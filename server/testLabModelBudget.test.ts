import test from 'node:test';
import assert from 'node:assert/strict';
import {callModel,ModelResponseError} from './test-lab/model.ts';
const options={apiKey:'test',endpoint:'https://example.com/responses',model:'deepseek/deepseek-v4.1-flash',maxOutputTokens:16000,timeoutMs:1000};
test('DeepSeek uses a supported low reasoning effort while other models retain their setting',async()=>{
 for(const model of [options.model,'pa/gpt-5.5'])await callModel({...options,model},'instructions',{},new AbortController().signal,async(_url,init)=>{
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


test('显式关闭 DeepSeek 推理保留完整输出预算，默认调用仍保持原配置',async()=>{
  const response=await callModel({...options,reasoningEffort:'none'},'json',{},new AbortController().signal,async(_url,init)=>{
    const body=JSON.parse(String(init?.body));assert.equal(body.reasoning.effort,'none');assert.equal(body.max_output_tokens,16000);assert.equal(body.text.format.type,'json_object');assert.equal(body.tools,undefined);
    return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{"tasks":[]}'}]}],usage:{input_tokens:5,output_tokens:4,total_tokens:9}});
  });assert.equal(response.rawOutput,'{"tasks":[]}');
});

test('Qwen 使用 chat JSON 模式、关闭混合推理且保留输入和预算',async()=>{
 const input={userRequest:'创建一个脚本任务',members:[{id:'lin',role:'内容'}]};
 const response=await callModel({...options,model:'qwen/qwen3.7-plus'},'完整规则',input,new AbortController().signal,async(url,init)=>{
  assert.equal(String(url),'https://example.com/chat/completions');
  const body=JSON.parse(String(init?.body));
  assert.equal(body.max_tokens,16000);assert.equal(body.enable_thinking,false);
  assert.deepEqual(body.response_format,{type:'json_object'});assert.equal(body.reasoning,undefined);assert.equal(body.max_output_tokens,undefined);
  assert.match(body.messages[0].content,/完整规则/);assert.deepEqual(JSON.parse(body.messages[1].content),input);
  return Response.json({choices:[{finish_reason:'stop',message:{content:'{"tasks":[]}'}}],usage:{prompt_tokens:40,completion_tokens:20,total_tokens:60}});
 });
 assert.equal(response.rawOutput,'{"tasks":[]}');assert.deepEqual(response.usage,{inputTokens:40,outputTokens:20,totalTokens:60});
});
test('Qwen 输出预算耗尽保留正文和 chat 推理用量，不自动重试',async()=>{
 let calls=0;
 await assert.rejects(()=>callModel({...options,model:'qwen/qwen3.7-plus'},'JSON',{},new AbortController().signal,async()=>{
  calls++;return Response.json({choices:[{finish_reason:'length',message:{content:'{"tasks":['}}],usage:{completion_tokens:16000,completion_tokens_details:{reasoning_tokens:500}}});
 }),e=>e instanceof ModelResponseError&&e.message.includes('推理 500')&&e.response.rawOutput==='{"tasks":[');
 assert.equal(calls,1);
});
test('下架型号的 404 指向目录同步且不暴露上游正文、不重试',async()=>{
 let calls=0;
 await assert.rejects(()=>callModel({...options,model:'qwen/unavailable'},'JSON',{},new AbortController().signal,async()=>{calls++;return new Response('SECRET',{status:404});}),e=>e instanceof Error&&e.message.includes('同步可用目录')&&!e.message.includes('SECRET'));
 assert.equal(calls,1);
});
