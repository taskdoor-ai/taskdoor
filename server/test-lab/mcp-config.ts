import {existsSync,readFileSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
import type {McpConfig} from './mcp-execution.ts';
export function createMcpTokenConfig(path:string,defaults:McpConfig){
 let override:string|undefined;
 if(existsSync(path)){const saved=JSON.parse(readFileSync(path,'utf8'));if(typeof saved.token==='string'&&saved.token)override=saved.token;}
 const current=()=>({...defaults,token:override??defaults.token});
 return {current,source:()=>override?'custom' as const:'default' as const,
  save(token:string|undefined,useDefault=false){
   if(!useDefault&&!token?.trim())return current();
   const next=useDefault?undefined:token!.trim();
   if(next&&(!/^[\x21-\x7E]+$/.test(next)||next.length>4096))throw Error('Token 格式无效：请使用不含空白的令牌');
   mkdirSync(dirname(path),{recursive:true});writeFileSync(path+'.tmp',JSON.stringify(next?{token:next}:{}),{mode:0o600});renameSync(path+'.tmp',path);override=next;return current();
  }
 };
}
