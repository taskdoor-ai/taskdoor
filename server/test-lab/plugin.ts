import { randomBytes, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin, type ResolvedConfig } from 'vite';
import { z, ZodError } from 'zod';
import { createLabStore } from './store.ts';
import { seedLab } from './seeds.ts';
import { createRunner } from './runner.ts';
import { labSkills } from './skills.ts';
import { buildView } from './context.ts';
import { importLibrary } from './library.ts';
import { editableSchema } from './schema.ts';
import type { LabCase } from '../../src/test-lab/types.ts';

export function guardRequest(method:string,headers:IncomingHttpHeaders,address:string,token:string){
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address))throw new Error('测试工作台仅允许本机访问');
  if(!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(headers.host??''))throw new Error('不支持该 Host');
  if(headers['sec-fetch-site']==='cross-site')throw new Error('禁止跨站访问');
  if(headers.origin&&headers.origin!==`http://${headers.host}`&&headers.origin!==`https://${headers.host}`)throw new Error('禁止跨源访问');
  if(method!=='GET'){
    if(!headers['content-type']?.startsWith('application/json'))throw new Error('写入需要 JSON');
    const provided=headers['x-test-lab-csrf'];if(typeof provided!=='string'||Buffer.byteLength(provided)!==Buffer.byteLength(token)||!timingSafeEqual(Buffer.from(provided),Buffer.from(token)))throw new Error('请求令牌失效，请刷新页面后重试');
  }
}
async function body(req:IncomingMessage){let size=0;const parts:Buffer[]=[];for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>8_000_000)throw new Error('请求超过 8 MB 限制');parts.push(bytes);}try{return JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');}catch{throw new Error('请求不是有效 JSON');}}
const send=(res:ServerResponse,status:number,payload:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));};
const bounded=(value:string|undefined,fallback:number,min:number,max:number)=>{const n=Number(value);return Number.isFinite(n)&&n>=min?Math.min(Math.floor(n),max):fallback;};

export function testLabPlugin():Plugin{
  let viteConfig:ResolvedConfig;
  const attach=(server:any)=>{
    const env={...loadEnv(viteConfig.mode,viteConfig.root,''),...process.env};
    const endpoint=env.PPIO_BASE_URL?`${env.PPIO_BASE_URL.replace(/\/$/,'').replace(/\/responses$/,'')}/responses`:'https://api.ppinfra.com/openai/v1/responses';
    const parsed=new URL(endpoint);if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash)throw new Error('PPIO_BASE_URL 需为无凭据的 HTTPS API 根地址');
    const options={apiKey:env.PPIO_API_KEY,endpoint,model:env.PPIO_MODEL||'pa/gpt-5.5-pro',maxOutputTokens:bounded(env.TEST_LAB_MAX_OUTPUT_TOKENS,8000,512,32000),timeoutMs:bounded(env.TEST_LAB_TIMEOUT_MS,180000,1000,600000)};
    const store=createLabStore(resolve(viteConfig.root,'data/test-lab/state.json'),seedLab());
    const runner=createRunner(store,options);const csrfToken=randomBytes(32).toString('hex');
    const config={configured:!!options.apiKey,model:options.model,endpoint,maxBatchSize:5,maxOutputTokens:options.maxOutputTokens,timeoutMs:options.timeoutMs,storage:'本机 data/test-lab/state.json（独立沙箱）'};
    server.httpServer?.once('close',()=>runner.close());
    server.middlewares.use(async(req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
      if(req.url==='/test-lab'||req.url==='/test-lab/'){res.writeHead(302,{Location:'/test-lab.html'});res.end();return;}
      if(!req.url?.startsWith('/api/test-lab/'))return next();
      try{guardRequest(req.method??'GET',req.headers,req.socket.remoteAddress??'',csrfToken);}catch(e){send(res,403,{error:(e as Error).message});return;}
      try{
        const url=new URL(req.url,'http://localhost'),path=url.pathname.replace('/api/test-lab','');
        if(req.method==='GET'&&path==='/bootstrap'){send(res,200,{state:store.get(),config,skills:labSkills,csrfToken});return;}
        if(req.method==='GET'&&path==='/view'){const team=store.get().teams.find(t=>t.id===url.searchParams.get('teamId'));if(!team)throw new Error('团队不存在');send(res,200,buildView(team,url.searchParams.get('actorId')??''));return;}
        if(req.method==='PUT'&&path==='/state'){const value=editableSchema.parse(await body(req));send(res,200,store.save(value.expectedRevision,value.teams,value.cases as LabCase[]));return;}
        if(req.method==='POST'&&path==='/runs'){const value=z.object({caseIds:z.array(z.string()).min(1).max(5),requestId:z.string().min(1).max(100)}).strict().parse(await body(req));send(res,202,runner.enqueue(value.caseIds,value.requestId));return;}
        if(req.method==='POST'&&path==='/library/import'){await body(req);send(res,200,importLibrary(store));return;}
        const match=path.match(/^\/runs\/([^/]+)\/(cancel|review)$/);
        if(req.method==='POST'&&match){const value=await body(req);if(match[2]==='cancel')send(res,200,runner.cancel(match[1]));else{const review=z.object({verdict:z.enum(['passed','failed']),note:z.string().min(1).max(5000)}).strict().parse(value);send(res,200,runner.review(match[1],review.verdict,review.note));}return;}
        send(res,404,{error:'测试接口不存在'});
      }catch(e){const message=e instanceof ZodError?e.issues.slice(0,3).map(i=>`${i.path.join('.')}: ${i.message}`).join('；'):e instanceof Error?e.message:'请求失败';send(res,message.includes('数据版本')?409:400,{error:message});}
    });
  };
  return {name:'agentdoor-test-lab',configResolved(config){viteConfig=config;},configureServer:attach,configurePreviewServer:attach};
}
