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
    const response=await transport(endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${options.apiKey}`},signal:controller.signal,
      body:JSON.stringify({model:options.model,instructions,input:[{role:'user',content:JSON.stringify(input)}],max_output_tokens:options.maxOutputTokens,reasoning:{effort:'medium'},store:false,text:{format:{type:'json_object'},verbosity:'low'}})});
    if([401,403].includes(response.status))throw new Error('模型服务认证失败，请检查服务端 Key 与模型权限');
    if(response.status===429)throw new Error('模型服务限流或额度不足；本次没有自动重试');
    if(!response.ok)throw new Error(`模型服务返回 HTTP ${response.status}；已隐藏上游错误正文`);
    const raw=await response.text();if(raw.length>2_000_000)throw new Error('上游响应过大');
    let payload:Record<string,any>;try{payload=JSON.parse(raw);}catch{throw new Error('上游响应不是有效 JSON');}
    const rawOutput=Array.isArray(payload.output)?payload.output.flatMap((o:any)=>Array.isArray(o?.content)?o.content:[]).filter((c:any)=>c?.type==='output_text'&&typeof c.text==='string').map((c:any)=>c.text).join(''):'';
    const number=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?n:null;
    const result={rawOutput,usage:{inputTokens:number(payload.usage?.input_tokens),outputTokens:number(payload.usage?.output_tokens),totalTokens:number(payload.usage?.total_tokens)}};
    if(payload.status==='incomplete'||!rawOutput)throw new ModelResponseError(payload.status==='incomplete'?'模型在输出上限内未生成完整答案；未自动重试':'模型未返回可用文本；未自动重试',result);
    return result;
  }catch(error){
    if(controller.signal.aborted)throw new Error(signal.aborted?'运行已取消':'模型调用超时；未自动重试');
    if(error instanceof TypeError)throw new Error('无法连接模型服务，请检查网络和服务端地址');
    throw error;
  }finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);}
}
