import {useState} from 'react';
import JsonView from '@uiw/react-json-view';
import type {McpDebugCall} from '@taskdoor/types';
import {Button,Notice} from './shared';

// Prefer the MCP structured payload; parse text JSON only when it is the sole content block.
function payload(response:any):unknown {
 if(response?.structuredContent!==undefined)return response.structuredContent;
 const content=response?.content;
 if(Array.isArray(content)&&content.length===1&&content[0].type==='text'){
  try{return JSON.parse(content[0].text);}catch{return content[0].text;}
 }
 return content??response;
}
function Tree({value}:{value:unknown}){
 if(value===null||typeof value!=='object')return <pre className="mcp-response-text">{typeof value==='string'?value:JSON.stringify(value)}</pre>;
 return <div className="mcp-json-tree"><JsonView value={value} collapsed={3} displayDataTypes={false} enableClipboard={true} shortenTextAfterLength={120} /></div>;
}
export default function McpResponse({result}:{result:McpDebugCall}){
 const [copied,setCopied]=useState(false);const [copyError,setCopyError]=useState('');
 const value=payload(result.result);const ok=result.status==='completed'&&!result.result?.isError;
 async function copy(){try{await navigator.clipboard.writeText(JSON.stringify(value,null,2));setCopied(true);setCopyError('');}catch{setCopyError('复制失败，请使用树节点旁的复制按钮。');}}
 return <section className="mcp-response" aria-label="工具响应">
  <div className="mcp-response-heading"><h3>工具响应 <span className={`mcp-response-badge ${ok?'is-success':'is-error'}`}>{result.status!=='completed'?'待核对':ok?'成功':'错误'}</span></h3><Button variant="outline" onClick={()=>void copy()}>{copied?'已复制':'复制 JSON'}</Button></div>
  <p className="business-muted">耗时 {(result.durationMs/1000).toFixed(2)} 秒</p>
  <Notice error={result.error??copyError}/>
  <Tree value={value}/>
  <details><summary>请求信息与实际参数</summary><p className="business-muted break-all">请求 ID：{result.id}</p><Tree value={result.arguments}/></details>
  <details><summary>原始 MCP 回执</summary><Tree value={result.result}/></details>
 </section>;
}
