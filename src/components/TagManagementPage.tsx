import { useGlobalUi } from "../i18n/globalUi";
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
  embedded?: boolean;
  onBack?: () => void;
  onChange: (tags: TagDefinition[]) => void;
};

type EditorState = { id?: string; name: string; icon: TagIconName; color: TagColorName };

const emptyEditor = (): EditorState => ({ name: "", icon: "tag", color: "blue" });

export function TagManagementPage({ embedded = false, onBack, onChange, tags }: Props) {
  const ui = useGlobalUi();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagDefinition | null>(null);
  const [error, setError] = useState("");
  const previewTag: TagDefinition | null = editor ? { id: editor.id ?? "preview", name: editor.name.trim() || "标签预览", icon: editor.icon, color: editor.color } : null;
  const tagNameDuplicate = Boolean(editor?.name.trim() && tags.some((tag) => tag.name === editor.name.trim() && tag.id !== editor.id));

  const saveTag = () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name || tagNameDuplicate) return;
    const nextTag: TagDefinition = { id: editor.id ?? crypto.randomUUID(), name, icon: editor.icon, color: editor.color };
    try {
      onChange(editor.id ? tags.map((tag) => tag.id === editor.id ? nextTag : tag) : [...tags, nextTag]);
      setEditor(null);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "标签未能保存，请重试。");
    }
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
    try {
      onChange(tags.filter((tag) => tag.id !== deleteTarget.id));
      setDeleteTarget(null);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "标签未能删除，请重试。");
    }
  };

  return <article className="tag-management-page">
    {!embedded && <nav aria-label={ui("当前位置")} className="tag-management-breadcrumb"><button onClick={onBack} type="button">{ui("任务")}</button><ChevronRight aria-hidden="true" /><strong aria-current="page">{ui("我的标签")}</strong></nav>}
    <header className="tag-management-heading">
      <div className="tag-management-heading-copy"><div className="tag-management-title">{embedded ? <DialogTitle render={<h1 />}>{ui("我的标签")}</DialogTitle> : <h1>{ui("我的标签")}</h1>}<span>{tags.length}{ui("个标签")}</span></div><p>{ui("维护你添加任务标签时可使用的个人标签。")}</p></div>
      <div className="tag-management-actions"><Button onClick={() => setEditor(emptyEditor())} size="lg" type="button"><Plus data-icon="inline-start" />{ui("新建标签")}</Button></div>
    </header>

    {tags.length > 0 ? <section aria-label={ui("个人标签列表")} className="tag-list-panel">
      <ul className="tag-list">{tags.map((tag) => <li key={tag.id}>
        <button aria-label={ui("编辑标签：{0}", {0: tag.name})} className="tag-list-edit" onClick={() => setEditor({ ...tag })} type="button"><TagBadge tag={tag} /><span>{ui("编辑")}</span></button>
        <Button aria-label={ui("删除标签：{0}", {0: tag.name})} className="tag-list-delete" onClick={() => requestDelete(tag)} size="icon-sm" title={ui("删除标签：{0}", {0: tag.name})} type="button" variant="ghost"><Trash2 aria-hidden="true" /></Button>
      </li>)}</ul>
    </section> : <section aria-label={ui("空标签列表")} className="tag-management-empty"><span className="tag-management-empty-icon"><Tags aria-hidden="true" /></span><div><h2>{ui("还没有标签")}</h2><p>{ui("创建一个标签，用于筛选和识别任务。")}</p></div><Button onClick={() => setEditor(emptyEditor())} type="button"><Plus data-icon="inline-start" />{ui("新建标签")}</Button></section>}

    {error && !editor && <p className="tag-editor-field-error" role="alert">{ui(error)}</p>}
    <Dialog onOpenChange={(open) => { if (!open) { setEditor(null); setError(""); } }} open={Boolean(editor)}><DialogContent className="tag-editor-dialog"><DialogHeader className="tag-dialog-heading"><span className="tag-dialog-mark"><Tag aria-hidden="true" /></span><div><DialogTitle>{editor?.id ? ui("编辑标签") : ui("新建标签")}</DialogTitle><DialogDescription>{editor?.id ? ui("调整个人标签的名称和识别样式，已保存任务上的标签保持不变。") : ui("创建一个可直接用于任务的个人标签。")}</DialogDescription></div></DialogHeader>{error && <p className="tag-editor-field-error" role="alert">{ui(error)}</p>}{editor && previewTag && <div className="tag-editor-body">
      <div className="tag-editor-primary-fields"><label className="tag-editor-field"><span>{ui("名称")}</span><input aria-invalid={tagNameDuplicate} autoFocus className="tag-editor-input" maxLength={24} onChange={(event) => setEditor({ ...editor, name: event.target.value })} placeholder={ui("例如：高优先级")} value={editor.name} />{tagNameDuplicate && <small className="tag-editor-field-error">{ui("该标签名称已存在")}</small>}</label></div>
      <TagAppearancePicker color={editor.color} icon={editor.icon} onColorChange={(color) => setEditor({ ...editor, color })} onIconChange={(icon) => setEditor({ ...editor, icon })} previewTag={previewTag} />
    </div>}<DialogFooter className="tag-editor-footer">{editor?.id && <Button className="tag-editor-delete" onClick={requestEditorDelete} type="button" variant="destructive"><Trash2 data-icon="inline-start" />{ui("删除标签")}</Button>}<span className="tag-editor-footer-spacer" /><Button onClick={() => setEditor(null)} type="button" variant="ghost">{ui("取消")}</Button><Button disabled={!editor?.name.trim() || tagNameDuplicate} onClick={saveTag} type="button">{editor?.id ? ui("保存更改") : ui("创建标签")}</Button></DialogFooter></DialogContent></Dialog>

    <AlertDialog onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} open={Boolean(deleteTarget)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{ui("删除个人标签？")}</AlertDialogTitle><AlertDialogDescription>「{deleteTarget?.name}{ui("」将从你的可选标签列表中移除，已添加到任务上的标签会保留。")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{ui("取消")}</AlertDialogCancel><AlertDialogAction className="tag-delete-confirm" onClick={confirmDelete}>{ui("确认删除")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </article>;
}
