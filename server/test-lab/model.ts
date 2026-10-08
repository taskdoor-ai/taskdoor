export type ModelOptions={apiKey?:string;endpoint:string;model:string;maxOutputTokens:number;timeoutMs:number};
export type ModelResponse={rawOutput:string;usage:{inputTokens:number|null;outputTokens:number|null;totalTokens:number|null}};
export class ModelResponseError extends Error { constructor(message:string,public response:ModelResponse){super(message);} }
export type ModelCall=(options:ModelOptions,instructions:string,input:unknown,signal:AbortSignal)=>Promise<ModelResponse>;
export async function callModel(options:ModelOptions,instructions:string,input:unknown,signal:AbortSignal,transport:typeof fetch=fetch):Promise<ModelResponse>{
  if(!options.apiKey)throw new Error('未配置 PPIO API Key，请在服务端环境配置');
  const endpoint=new URL(options.endpoint);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw new Error('模型地址必须是无凭据、无查询参数的 HTTPS URL');
  if(signal.aborted)throw new Error('运行已取消');
  const controller=new AbortController();const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
  const timeout=setTimeout(abort,options.timeoutMs);
  try{
    const original=JSON.stringify(input);
    // DeepSeek supports low/high/max; medium is not a supported native level.
    const effort=/deepseek[/-](?:deepseek-)?v4/i.test(options.model)?'low':'medium';
    const chat=/^pa\/claude-/i.test(options.model);
    const target=chat?new URL(endpoint.href.replace(/\/responses$/,'/chat/completions')):endpoint;
    const response=await transport(target,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${options.apiKey}`},signal:controller.signal,
      body:JSON.stringify(chat?{model:options.model,messages:[{role:'system',content:instructions+'\n只返回有效 JSON，不加 Markdown 代码围栏。'},{role:'user',content:original}],max_tokens:options.maxOutputTokens}:{model:options.model,instructions,input:[{role:'user',content:'请按约定的结构返回完整 JSON。说明保持简洁，不重复输入原文，不省略必填字段、必要任务或证据引用。输出使用 Skill 约定的普通 JSON。\n'+original}],max_output_tokens:options.maxOutputTokens,reasoning:{effort},store:false,text:{format:{type:'json_object'},verbosity:'low'}})});
    if([401,403].includes(response.status))throw new Error('模型服务认证失败，请检查服务端 Key 与模型权限');
    if(response.status===429)throw new Error('模型服务限流或额度不足；本次没有自动重试');
    if(!response.ok)throw new Error(`模型服务返回 HTTP ${response.status}；已隐藏上游错误正文`);
    const raw=await response.text();if(raw.length>2_000_000)throw new Error('上游响应过大');
    let payload:Record<string,any>;try{payload=JSON.parse(raw);}catch{throw new Error('上游响应不是有效 JSON');}
    const rawOutput=chat&&typeof payload.choices?.[0]?.message?.content==='string'?payload.choices[0].message.content:Array.isArray(payload.output)?payload.output.flatMap((o:any)=>Array.isArray(o?.content)?o.content:[]).filter((c:any)=>c?.type==='output_text'&&typeof c.text==='string').map((c:any)=>c.text).join(''):'';
    const number=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?n:null;
    const result={rawOutput,usage:{inputTokens:number(payload.usage?.input_tokens??payload.usage?.prompt_tokens),outputTokens:number(payload.usage?.output_tokens??payload.usage?.completion_tokens),totalTokens:number(payload.usage?.total_tokens)}};
    if(payload.status==='incomplete'||chat&&payload.choices?.[0]?.finish_reason==='length'){
      const reason=payload.incomplete_details?.reason||(chat?'max_output_tokens':undefined);
      const reasoningTokens=number(payload.usage?.output_tokens_details?.reasoning_tokens);
      const usage=`已用输出 ${result.usage.outputTokens??'未知'} / 上限 ${options.maxOutputTokens} Token${reasoningTokens===null?'':`，其中推理 ${reasoningTokens} Token`}`;
      const cause=reason==='max_output_tokens'?'模型耗尽输出预算（包含推理与正文）':reason==='content_filter'?'模型响应因内容过滤未完成':'模型响应未完成（上游未明确报告输出预算耗尽）';
      throw new ModelResponseError(`${cause}；${usage}；${rawOutput?'部分正文已保留':'未返回最终 JSON'}；未自动重试`,result);
    }
    if(!rawOutput)throw new ModelResponseError('模型未返回可用文本；未自动重试',result);
    return result;
  }catch(error){
    if(controller.signal.aborted)throw new Error(signal.aborted?'运行已取消':'模型调用超时；未自动重试');
    if(error instanceof TypeError)throw new Error('无法连接模型服务，请检查网络和服务端地址');
    throw error;
  }finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);}
}
