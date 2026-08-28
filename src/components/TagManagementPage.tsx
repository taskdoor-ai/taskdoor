import { ChevronRight, Plus, Tag, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import type { TagColorName, TagDefinition, TagIconName } from "../data/tagGroups";
import { TagAppearancePicker } from "./TagAppearancePicker";
import { TagBadge } from "./TagBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

type Props = {
  tags: TagDefinition[];
  onChange: (tags: TagDefinition[]) => void;
  onDeleteTag: (tag: string) => void;
  onRenameTag: (from: string, to: string) => void;
};

type EditorState = { id?: string; name: string; icon: TagIconName; color: TagColorName };

const emptyEditor = (): EditorState => ({ name: "", icon: "tag", color: "blue" });

export function TagManagementPage({ onChange, onDeleteTag, onRenameTag, tags }: Props) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagDefinition | null>(null);
  const previewTag: TagDefinition | null = editor ? { id: editor.id ?? "preview", name: editor.name.trim() || "标签预览", icon: editor.icon, color: editor.color } : null;
  const tagNameDuplicate = Boolean(editor?.name.trim() && tags.some((tag) => tag.name === editor.name.trim() && tag.id !== editor.id));

  const saveTag = () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name || tagNameDuplicate) return;
    const nextTag: TagDefinition = { id: editor.id ?? crypto.randomUUID(), name, icon: editor.icon, color: editor.color };
    if (!editor.id) {
      onChange([...tags, nextTag]);
      setEditor(null);
      return;
    }
    const previous = tags.find((tag) => tag.id === editor.id);
    onChange(tags.map((tag) => tag.id === editor.id ? nextTag : tag));
    if (previous && previous.name !== name) onRenameTag(previous.name, name);
    setEditor(null);
  };

  const requestDelete = (tag: TagDefinition) => {
    setEditor(null);
    setDeleteTarget(tag);
  };

  const requestEditorDelete = () => {
    if (!editor?.id) return;
    const persistedTag = tags.find((tag) => tag.id === editor.id);
    if (persistedTag) requestDelete(persistedTag);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    onChange(tags.filter((tag) => tag.id !== deleteTarget.id));
    onDeleteTag(deleteTarget.name);
    setDeleteTarget(null);
  };

  return <main className="tag-management-page">
    <nav aria-label="当前位置" className="tag-management-breadcrumb"><span>企业设置</span><ChevronRight aria-hidden="true" /><strong aria-current="page">标签管理</strong></nav>
    <header className="tag-management-heading">
      <div className="tag-management-heading-copy"><h1>标签管理</h1><p>统一管理任务标签，让分类语言保持简单、清晰。</p></div>
      <div className="tag-management-actions"><Button onClick={() => setEditor(emptyEditor())} size="lg" type="button"><Plus data-icon="inline-start" />新建标签</Button></div>
    </header>

    {tags.length > 0 ? <section aria-labelledby="tag-list-title" className="tag-list-panel">
      <header className="tag-list-header"><div><h2 id="tag-list-title">全部标签</h2><p>标签可直接用于任务，不设额外层级。</p></div><span>{tags.length} 个标签</span></header>
      <ul className="tag-list">{tags.map((tag) => <li key={tag.id}>
        <button aria-label={`编辑标签：${tag.name}`} className="tag-list-edit" onClick={() => setEditor({ ...tag })} type="button"><TagBadge tag={tag} /><span>编辑</span></button>
        <Button aria-label={`删除标签：${tag.name}`} className="tag-list-delete" onClick={() => requestDelete(tag)} size="icon-sm" title={`删除标签：${tag.name}`} type="button" variant="ghost"><Trash2 aria-hidden="true" /></Button>
      </li>)}</ul>
    </section> : <section aria-label="空标签列表" className="tag-management-empty"><span className="tag-management-empty-icon"><Tags aria-hidden="true" /></span><div><h2>还没有标签</h2><p>创建一个标签，用于筛选和识别任务。</p></div><Button onClick={() => setEditor(emptyEditor())} type="button"><Plus data-icon="inline-start" />新建标签</Button></section>}

    <Dialog onOpenChange={(open) => { if (!open) setEditor(null); }} open={Boolean(editor)}><DialogContent className="tag-editor-dialog"><DialogHeader className="tag-dialog-heading"><span className="tag-dialog-mark"><Tag aria-hidden="true" /></span><div><DialogTitle>{editor?.id ? "编辑标签" : "新建标签"}</DialogTitle><DialogDescription>{editor?.id ? "调整标签名称和识别样式。" : "创建一个可直接用于任务的标签。"}</DialogDescription></div></DialogHeader>{editor && previewTag && <div className="tag-editor-body">
      <div className="tag-editor-primary-fields"><label className="tag-editor-field"><span>名称</span><input aria-invalid={tagNameDuplicate} autoFocus className="tag-editor-input" maxLength={24} onChange={(event) => setEditor({ ...editor, name: event.target.value })} placeholder="例如：高优先级" value={editor.name} />{tagNameDuplicate && <small className="tag-editor-field-error">该标签名称已存在</small>}</label></div>
      <TagAppearancePicker color={editor.color} icon={editor.icon} onColorChange={(color) => setEditor({ ...editor, color })} onIconChange={(icon) => setEditor({ ...editor, icon })} previewTag={previewTag} />
    </div>}<DialogFooter className="tag-editor-footer">{editor?.id && <Button className="tag-editor-delete" onClick={requestEditorDelete} type="button" variant="destructive"><Trash2 data-icon="inline-start" />删除标签</Button>}<span className="tag-editor-footer-spacer" /><Button onClick={() => setEditor(null)} type="button" variant="ghost">取消</Button><Button disabled={!editor?.name.trim() || tagNameDuplicate} onClick={saveTag} type="button">{editor?.id ? "保存更改" : "创建标签"}</Button></DialogFooter></DialogContent></Dialog>

    <AlertDialog onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} open={Boolean(deleteTarget)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除标签？</AlertDialogTitle><AlertDialogDescription>「{deleteTarget?.name}」会从所有任务中移除，此操作无法撤销。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction className="tag-delete-confirm" onClick={confirmDelete}>确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>;
}
