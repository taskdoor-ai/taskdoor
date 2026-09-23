import React, { useState } from 'react';
import type { LabState } from './types';
import { createLabClient } from './client';
export function categoryList(state:Pick<LabState,'cases'|'categories'>){
  return [...new Set([...(state.categories??[]).map(c=>c.name),...state.cases.map(c=>c.category)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
}
export function CategoryManager({state,client,onSave}:{state:LabState;client:ReturnType<typeof createLabClient>;onSave:(state:LabState)=>void}){
  const [name,setName]=useState(''),[description,setDescription]=useState(''),[previous,setPrevious]=useState<string|undefined>();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  return <div className="lab-dialog-body"><p>分类说明这条用例测试什么方面。新增分类后，可在用例编辑器中选择；重命名同步更新当前用例，历史运行保留原分类。</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{onSave(await client.saveCategory(state.revision,{name,description,previousName:previous}));setName('');setDescription('');setPrevious(undefined);setNotice('分类已保存。');}catch(e){setError(e instanceof Error?e.message:'保存失败');}finally{setBusy(false);}}}>
    <label className="lab-field"><span>分类名称</span><input required maxLength={80} value={name} disabled={busy} onChange={e=>setName(e.target.value)} placeholder="例如：负责人匹配、需求澄清"/></label><label className="lab-field"><span>测试方向说明</span><textarea maxLength={1000} rows={2} value={description} disabled={busy} onChange={e=>setDescription(e.target.value)} placeholder="说明这类测试要验证的能力或边界"/></label>
    {error&&<p role="alert" className="lab-alert lab-alert-error">{error}</p>}{notice&&<p role="status">{notice}</p>}<div className="lab-actions"><button type="submit" className="lab-primary" disabled={busy||!name.trim()}>{busy?'保存中…':previous?'保存分类':'新增分类'}</button>{previous&&<button type="button" disabled={busy} onClick={()=>{setPrevious(undefined);setName('');setDescription('');}}>取消编辑</button>}</div></form>
    <div className="lab-table-scroll"><table className="lab-comparison-table"><thead><tr><th>分类</th><th>测试方向</th><th>用例数</th><th>操作</th></tr></thead><tbody>{categoryList(state).map(n=><tr key={n}><th>{n}</th><td>{state.categories?.find(c=>c.name===n)?.description||'未填写说明'}</td><td>{state.cases.filter(c=>c.category===n&&!c.archived).length}</td><td><button disabled={busy} onClick={()=>{setPrevious(n);setName(n);setDescription(state.categories?.find(c=>c.name===n)?.description||'');setError('');setNotice('');}}>编辑分类</button></td></tr>)}</tbody></table></div>
  </div>;
}
