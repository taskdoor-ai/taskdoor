import {z} from 'zod';
import {modelIdSchema} from './schema.ts';

// The provider's list is authoritative; a failed/empty response never clears saved settings.
export async function fetchModelCatalog(endpoint:string,apiKey:string|undefined,transport:typeof fetch=fetch):Promise<string[]>{
  if(!apiKey)throw new Error('请先配置服务端 API Key');
  const url=new URL(endpoint);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('模型目录地址必须是无凭据的 HTTPS URL');
  url.pathname=url.pathname.replace(/\/(responses|chat\/completions)\/?$/,'/models');
  let response:Response;
  try{response=await transport(url,{headers:{Authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new Error('无法读取模型目录，原配置已保留，请稍后重试');}
  if(!response.ok)throw new Error(`模型目录返回 HTTP ${response.status}，原配置已保留`);
  const payload=z.object({data:z.array(z.object({id:modelIdSchema})).min(1).max(5000)}).safeParse(await response.json().catch(()=>null));
  if(!payload.success)throw new Error('模型目录格式无效或为空，原配置已保留');
  return [...new Set(payload.data.data.map(item=>item.id))].sort();
}
