import React, {useEffect,useId,useRef,useState} from 'react';
import {Check,ChevronDown} from 'lucide-react';

export function FilterSelect({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);const [active,setActive]=useState(0);
 const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const list=useRef<HTMLDivElement>(null);const id=useId();
 const selected=options.find(o=>o.value===value)??options[0];
 function show(){setActive(Math.max(0,options.findIndex(o=>o.value===value)));setOpen(true);}
 function close(focus=false){setOpen(false);if(focus)trigger.current?.focus();}
 function choose(index:number){if(options[index])onChange(options[index].value);close(true);}
 useEffect(()=>{if(!open)return;list.current?.focus();const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 useEffect(()=>{if(open)list.current?.children[active]?.scrollIntoView({block:'nearest'});},[active,open]);
 return <div className="lab-filter-select" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}}>
  <button type="button" ref={trigger} aria-label={`${label}：${selected?.label??''}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>open?close():show()} onKeyDown={e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();show();}}}><span>{selected?.label}</span><ChevronDown size={14}/></button>
  {open&&<div id={id} className="lab-filter-menu" role="listbox" aria-label={label} tabIndex={-1} ref={list} aria-activedescendant={`${id}-${active}`} onKeyDown={e=>{
   if(e.key==='Escape'){e.preventDefault();close(true);}
   else if(e.key==='Tab')close();
   else if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(active);}
   else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();setActive(i=>e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length);}
   else if(e.key.length===1){const match=options.findIndex((o,i)=>i>active&&o.label.toLocaleLowerCase().startsWith(e.key.toLocaleLowerCase()));if(match>=0)setActive(match);}
  }}>{options.map((o,i)=><div key={o.value} id={`${id}-${i}`} role="option" aria-selected={o.value===value} className={i===active?'is-active':''} onMouseMove={()=>setActive(i)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(i)}><span>{o.label}</span>{o.value===value&&<Check size={14}/>}</div>)}</div>}
 </div>;
}
