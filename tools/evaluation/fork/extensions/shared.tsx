import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {createLabClient} from '@taskdoor/client';
import {useLocation} from 'react-router-dom';
import type {LabBootstrap,LabState} from '@taskdoor/types';
import {PageContainer} from '@app/components/layout/PageContainer';
import {PageHeader} from '@app/components/layout/PageHeader';
import {Button} from '@app/components/ui/button';
import {Input} from '@app/components/ui/input';
import {Textarea} from '@app/components/ui/textarea';
import {Card} from '@app/components/ui/card';

import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from '@app/components/ui/dialog';
export {Button,Input,Textarea,Card,Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter};
export const errorText=(e:unknown)=>e instanceof Error?e.message:'操作失败，请重试';
type Business={data:LabBootstrap|null;error:string;refresh:()=>Promise<void>;apply:(s:LabState)=>void;client:ReturnType<typeof createLabClient>};
// Preserve the context identity while Vite updates providers and route consumers.
const Context:React.Context<Business|null>=import.meta.hot?.data.businessContext??createContext<Business|null>(null);
if(import.meta.hot)import.meta.hot.data.businessContext=Context;
export function BusinessProvider({children}:{children:React.ReactNode}){const location=useLocation();const query=new URLSearchParams(location.search);const batch=location.pathname.startsWith('/eval/taskdoor-')?decodeURIComponent(location.pathname.slice('/eval/taskdoor-'.length)):query.get('batch')??undefined;const result=query.get('result')??undefined;const[data,setData]=useState<LabBootstrap|null>(null);const[error,setError]=useState('');const client=useMemo(()=>createLabClient(data?.csrfToken),[data?.csrfToken]);async function refresh(){try{const loaded=await client.bootstrap({...(batch?{batch}:{}),...(result?{result}:{})});setData(loaded);setError('');}catch(e){setError(errorText(e));}}useEffect(()=>{void refresh();},[batch,result]);return <Context.Provider value={{data,error,refresh,client,apply:state=>setData(d=>d?{...d,state}:d)}}>{children}</Context.Provider>;}
export function useBusiness(){const context=useContext(Context);if(!context)throw new Error('业务上下文未挂载：请检查应用根部 BusinessProvider');return context;}
export function Page({title,description,actions,children,embedded=false}:{title:string;description:string;actions?:React.ReactNode;children:React.ReactNode;embedded?:boolean}){const{data,error,refresh}=useBusiness();if(embedded)return <section className="business-fields"><div className="business-row justify-between"><h2 className="font-semibold">{title}</h2>{actions}</div>{children}</section>;return <PageContainer><PageHeader><div className="business-content"><div className="business-row justify-between"><div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="text-sm text-muted-foreground mt-1">{description}</p></div>{actions}</div></div></PageHeader><div className="business-content">{error&&<div role="alert">{error} <Button variant="outline" onClick={()=>void refresh()}>重试</Button></div>}{data?children:!error&&<p role="status">正在读取数据…</p>}</div></PageContainer>;}
export function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="business-fields gap-2 text-sm font-medium"><span>{label}</span>{children}</label>;}
export function GridTable({heads,children,className=""}:{heads:string[];children:React.ReactNode;className?:string}){return <div className={"data-table overflow-x-auto rounded-md border "+className}><table className="w-full min-w-[680px] text-sm"><thead className="bg-muted/50"><tr>{heads.map(h=><th className="px-4 py-3 text-left font-medium" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y">{children}</tbody></table></div>;}
export function Cell({children}:{children?:React.ReactNode}){return <td className="px-4 py-3 align-top">{children}</td>;}
export function Notice({error}:{error:string}){return error?<p role="alert" className="text-destructive text-sm">{error}</p>:null;}
