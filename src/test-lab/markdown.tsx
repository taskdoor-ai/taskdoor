import React, { useId, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, Pencil } from 'lucide-react';
import { isMarkdownName, markdownAttachment, replaceSkillDocument, splitSkillDocuments } from './markdown-files';

export function MarkdownContent({ content, onOpenLink }: { content: string; onOpenLink?: (href: string) => boolean }) {
  const frontmatter = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return <div className="lab-markdown">
    {frontmatter && <details className="lab-markdown-properties"><summary>文档属性</summary><pre>{frontmatter[1]}</pre></details>}
    <Markdown remarkPlugins={[remarkGfm]} components={{
      a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" onClick={event => { if (onOpenLink?.(props.href ?? '')) event.preventDefault(); }} />,
      table: ({ node: _node, ...props }) => <div className="lab-markdown-table"><table {...props} /></div>,
      img: ({ node: _node, ...props }) => <img {...props} loading="lazy" />,
    }}>{frontmatter ? content.slice(frontmatter[0].length) : content}</Markdown>
    {!content.trim() && <p className="lab-muted">文档暂无内容。</p>}
  </div>;
}

export function MarkdownEditor({ label, value, onChange, disabled = false, maxLength = 20000, markdown = true }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; maxLength?: number; markdown?: boolean }) {
  const id = useId();
  const [preview, setPreview] = useState(false);
  return <section className="lab-markdown-editor" aria-label={label}>
    <div className="lab-document-toolbar"><label htmlFor={id}>{label}</label><div className="lab-document-modes" role="group" aria-label={`${label}显示方式`}>
      <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>编辑</button>
      <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>预览</button>
    </div></div>
    {preview ? <div className="lab-document-body">{markdown ? <MarkdownContent content={value} /> : <pre>{value}</pre>}</div> : <textarea id={id} className="lab-markdown-source" rows={18} maxLength={maxLength} spellCheck={false} disabled={disabled} value={value} onChange={e => onChange(e.target.value)} />}
    <small className="lab-document-count">{value.length.toLocaleString()} / {maxLength.toLocaleString()} 字符</small>
  </section>;
}

export function DocumentView({ content, filename = '文档.md', onEdit, onOpenLink, downloadFile }: { content: string; filename?: string; onEdit?: () => void; onOpenLink?: (href: string) => boolean; downloadFile?: {name:string;dataUrl:string} }) {
  const [source, setSource] = useState(false);
  const isMarkdown = isMarkdownName(filename);
  const name = filename.split('/').at(-1) || '文档.md';
  const download = downloadFile ?? (isMarkdown ? markdownAttachment(name, content) : { name, dataUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(content)}` });
  return <section className="lab-document-view">
    <div className="lab-document-toolbar"><div className="lab-document-modes" role="group" aria-label="文档显示方式">
      <button type="button" aria-pressed={!source} onClick={() => setSource(false)}>阅读</button>
      <button type="button" aria-pressed={source} onClick={() => setSource(true)}>源码</button>
    </div><div className="lab-actions"><a className="lab-document-download" href={download.dataUrl} download={download.name}><Download size={13} />下载文件</a>{onEdit && <button type="button" onClick={onEdit}><Pencil size={13} />编辑文档</button>}</div></div>
    <div className="lab-document-body">{source || !isMarkdown ? <pre className="lab-document-source">{content}</pre> : <MarkdownContent content={content} onOpenLink={onOpenLink} />}</div>
  </section>;
}

export function SkillDocuments({ snapshot, selectedFile, onSelectFile, onChange, disabled, onEdit }: { snapshot: string; selectedFile: number; onSelectFile: (index: number) => void; onChange?: (snapshot: string) => void; disabled?: boolean; onEdit?: () => void }) {
  const documents = splitSkillDocuments(snapshot);
  const index = Math.min(selectedFile, documents.length - 1);
  const document = documents[index];
  const id = useId();
  const openReference = (href: string) => {
    try {
      const target = new URL(href, `https://skill.local/${document.path}`);
      const index = target.origin === 'https://skill.local' ? documents.findIndex(file => file.path === decodeURIComponent(target.pathname.slice(1))) : -1;
      if (index < 0) return false;
      onSelectFile(index);
      return true;
    } catch { return false; }
  };
  return <section className="lab-skill-documents">
    <div className="lab-document-picker"><label htmlFor={id}>文件 <small>{documents.length} 份</small></label><select id={id} value={index} disabled={disabled} onChange={e => onSelectFile(Number(e.target.value))}>{documents.map((item, i) => <option key={i} value={i}>{item.path}</option>)}</select></div>
    {onChange ? <MarkdownEditor key={document.path} label="文档正文" value={document.content} onChange={content => onChange(replaceSkillDocument(snapshot, index, content))} disabled={disabled} maxLength={300000} markdown={isMarkdownName(document.path)} /> : <DocumentView key={document.path} content={document.content} filename={document.path} onEdit={onEdit} onOpenLink={openReference} />}
  </section>;
}
