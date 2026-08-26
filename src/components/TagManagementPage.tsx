import { ArrowDown, ArrowUp, ChevronRight, Folder, Plus, Tag, Tags, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { TagColorName, TagDefinition, TagGroup, TagIconName } from "../data/tagGroups";
import { TagAppearancePicker } from "./TagAppearancePicker";
import { TagBadge } from "./TagBadge";
import { TagGroupCard } from "./TagGroupCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type Props = {
  groups: TagGroup[];
  onChange: (groups: TagGroup[]) => void;
  onDeleteTag: (tag: string) => void;
  onRenameTag: (from: string, to: string) => void;
};

type EditorState = { groupId: string; id?: string; name: string; icon: TagIconName; color: TagColorName; groupLocked: boolean };
type GroupEditorState = { id?: string; name: string; position: number; tags: TagDefinition[] };
type DeleteTarget = { kind: "group"; group: TagGroup } | { kind: "tag"; groupId: string; tag: TagDefinition };

const emptyEditor = (groupId: string, groupLocked = false): EditorState => ({ groupId, name: "", icon: "tag", color: "blue", groupLocked });

export function TagManagementPage({ groups, onChange, onDeleteTag, onRenameTag }: Props) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [groupEditor, setGroupEditor] = useState<GroupEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const activeGroup = useMemo(() => groups.find((group) => group.id === editor?.groupId), [editor?.groupId, groups]);
  const previewTag: TagDefinition | null = editor ? { id: editor.id ?? "preview", name: editor.name.trim() || "标签预览", icon: editor.icon, color: editor.color } : null;
  const tagNameDuplicate = Boolean(editor?.name.trim() && groups.some((group) => group.tags.some((tag) => tag.name === editor.name.trim() && tag.id !== editor.id)));
  const groupNameDuplicate = Boolean(groupEditor?.name.trim() && groups.some((group) => group.name === groupEditor.name.trim() && group.id !== groupEditor.id));

  const openGroupEditor = (group: TagGroup) => setGroupEditor({ id: group.id, name: group.name, position: groups.findIndex((item) => item.id === group.id), tags: [...group.tags] });

  const moveGroup = (direction: -1 | 1) => setGroupEditor((current) => current ? { ...current, position: Math.max(0, Math.min(groups.length - 1, current.position + direction)) } : current);

  const moveGroupTag = (tagId: string, direction: -1 | 1) => setGroupEditor((current) => {
    if (!current) return current;
    const index = current.tags.findIndex((tag) => tag.id === tagId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.tags.length) return current;
    const tags = [...current.tags];
    [tags[index], tags[nextIndex]] = [tags[nextIndex], tags[index]];
    return { ...current, tags };
  });

  const removeGroupTag = (tagId: string) => setGroupEditor((current) => current ? { ...current, tags: current.tags.filter((tag) => tag.id !== tagId) } : current);

  const saveGroup = () => {
    if (!groupEditor) return;
    const name = groupEditor.name.trim();
    const duplicate = groups.some((group) => group.name === name && group.id !== groupEditor.id);
    if (!name || duplicate) return;
    if (groupEditor.id) {
      const previous = groups.find((group) => group.id === groupEditor.id);
      previous?.tags.filter((tag) => !groupEditor.tags.some((draftTag) => draftTag.id === tag.id)).forEach((tag) => onDeleteTag(tag.name));
      const reordered = groups.filter((group) => group.id !== groupEditor.id);
      reordered.splice(groupEditor.position, 0, { id: groupEditor.id, name, tags: groupEditor.tags });
      onChange(reordered);
    } else onChange([...groups, { id: crypto.randomUUID(), name, tags: [] }]);
    setGroupEditor(null);
  };

  const saveTag = () => {
    if (!editor) return;
    const name = editor.name.trim();
    const duplicate = groups.some((group) => group.tags.some((tag) => tag.name === name && tag.id !== editor.id));
    if (!name || duplicate) return;
    let previousName = "";
    const withoutEditedTag = groups.map((group) => {
      if (!editor.id) return group;
      const existing = group.tags.find((tag) => tag.id === editor.id);
      if (!existing) return group;
      previousName = existing.name;
      return { ...group, tags: group.tags.filter((tag) => tag.id !== editor.id) };
    });
    const nextTag = { id: editor.id ?? crypto.randomUUID(), name, icon: editor.icon, color: editor.color };
    onChange(withoutEditedTag.map((group) => group.id === editor.groupId ? { ...group, tags: [...group.tags, nextTag] } : group));
    if (previousName && previousName !== name) onRenameTag(previousName, name);
    setEditor(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "tag") {
      onChange(groups.map((group) => group.id === deleteTarget.groupId ? { ...group, tags: group.tags.filter((tag) => tag.id !== deleteTarget.tag.id) } : group));
      onDeleteTag(deleteTarget.tag.name);
    } else {
      deleteTarget.group.tags.forEach((tag) => onDeleteTag(tag.name));
      onChange(groups.filter((group) => group.id !== deleteTarget.group.id));
    }
    setDeleteTarget(null);
  };

  const requestTagDelete = (groupId: string, tag: TagDefinition) => {
    setEditor(null);
    setDeleteTarget({ kind: "tag", groupId, tag });
  };

  return <main className="tag-management-page">
    <nav className="tag-management-breadcrumb"><span>企业设置</span><ChevronRight aria-hidden="true" /><strong>标签管理</strong></nav>
    <header className="tag-management-heading">
      <div className="tag-management-heading-copy"><h1>标签管理</h1><p>用标签组整理企业标签，为任务建立清晰、统一的分类语言。</p></div>
      <div className="tag-management-actions"><Button onClick={() => setGroupEditor({ name: "", position: groups.length, tags: [] })} size="lg" type="button" variant="outline"><Plus data-icon="inline-start" />新建标签组</Button></div>
    </header>

    <section className="tag-group-card-grid" aria-label="标签组">
      {groups.map((group) => <TagGroupCard group={group} key={group.id} onAddTag={() => setEditor(emptyEditor(group.id, true))} onDelete={() => setDeleteTarget({ kind: "group", group })} onEditGroup={() => openGroupEditor(group)} onEditTag={(tag) => setEditor({ groupId: group.id, groupLocked: false, ...tag })} />)}
      {groups.length === 0 && <div className="tag-management-empty"><span className="tag-management-empty-icon"><Tags aria-hidden="true" /></span><div><h2>创建第一个标签组</h2><p>标签组是轻量的整理方式，例如「客户」「阶段」或「主题」。</p></div><Button onClick={() => setGroupEditor({ name: "", position: 0, tags: [] })} type="button"><Plus data-icon="inline-start" />新建标签组</Button></div>}
    </section>

    <Dialog onOpenChange={(open) => { if (!open) setEditor(null); }} open={Boolean(editor)}><DialogContent className="tag-editor-dialog"><DialogHeader className="tag-dialog-heading"><span className="tag-dialog-mark"><Tag aria-hidden="true" /></span><div><DialogTitle>{editor?.id ? "编辑标签" : "新建标签"}</DialogTitle><DialogDescription>{editor?.id ? "调整标签的名称、归属和识别样式。" : `添加到${activeGroup ? `「${activeGroup.name}」` : "标签组"}，创建一个清晰的分类标签。`}</DialogDescription></div></DialogHeader>{editor && previewTag && <div className="tag-editor-body">
      <div className="tag-editor-primary-fields">{editor.groupLocked ? <div className="tag-editor-field"><span>标签组</span><div className="tag-editor-group-context"><Folder aria-hidden="true" /><span>{activeGroup?.name}</span></div></div> : <label className="tag-editor-field"><span>标签组</span><Select onValueChange={(value) => setEditor({ ...editor, groupId: value as string })} value={editor.groupId}><SelectTrigger className="tag-editor-select"><SelectValue>{activeGroup?.name}</SelectValue></SelectTrigger><SelectContent>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}</SelectContent></Select></label>}<label className="tag-editor-field"><span>名称</span><input className="tag-editor-input" aria-invalid={tagNameDuplicate} autoFocus maxLength={24} onChange={(event) => setEditor({ ...editor, name: event.target.value })} placeholder="例如：高优先级" value={editor.name} />{tagNameDuplicate && <small className="tag-editor-field-error">该标签名称已存在</small>}</label></div>
      <TagAppearancePicker color={editor.color} icon={editor.icon} onColorChange={(color) => setEditor({ ...editor, color })} onIconChange={(icon) => setEditor({ ...editor, icon })} previewTag={previewTag} />
    </div>}<DialogFooter className="tag-editor-footer">{editor?.id && <Button className="tag-editor-delete" onClick={() => requestTagDelete(editor.groupId, { id: editor.id!, name: editor.name, icon: editor.icon, color: editor.color })} type="button" variant="destructive"><Trash2 data-icon="inline-start" />删除标签</Button>}<span className="tag-editor-footer-spacer" /><Button onClick={() => setEditor(null)} type="button" variant="ghost">取消</Button><Button disabled={!editor?.name.trim() || !editor?.groupId || tagNameDuplicate} onClick={saveTag} type="button">{editor?.id ? "保存更改" : "创建标签"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog onOpenChange={(open) => { if (!open) setGroupEditor(null); }} open={Boolean(groupEditor)}><DialogContent className={`tag-group-dialog ${groupEditor?.id ? "tag-group-editor-dialog" : ""}`}><DialogHeader className="tag-dialog-heading"><span className="tag-dialog-mark"><Tags aria-hidden="true" /></span><div><DialogTitle>{groupEditor?.id ? "编辑标签组" : "新建标签组"}</DialogTitle><DialogDescription>{groupEditor?.id ? "调整标签组的位置和组内标签顺序。" : "用标签组整理相关标签，不会限制任务的选择数量。"}</DialogDescription></div></DialogHeader>{groupEditor && <div className={groupEditor.id ? "tag-group-editor-body" : "tag-group-create-body"}><label className="tag-editor-field"><span>标签组名称</span><input className="tag-editor-input" aria-invalid={groupNameDuplicate} autoFocus maxLength={24} onChange={(event) => setGroupEditor({ ...groupEditor, name: event.target.value })} placeholder="例如：客户、风险、产品线" value={groupEditor.name} />{groupNameDuplicate && <small className="tag-editor-field-error">该标签组名称已存在</small>}</label>{groupEditor.id && <><section className="tag-group-position-panel" aria-labelledby="tag-group-position-title"><div><strong id="tag-group-position-title">标签组位置</strong><span>当前第 {groupEditor.position + 1} 个，共 {groups.length} 个</span></div><div className="tag-order-actions"><Button aria-label="上移标签组" disabled={groupEditor.position === 0} onClick={() => moveGroup(-1)} size="icon" type="button" variant="outline"><ArrowUp /></Button><Button aria-label="下移标签组" disabled={groupEditor.position === groups.length - 1} onClick={() => moveGroup(1)} size="icon" type="button" variant="outline"><ArrowDown /></Button></div></section><section className="tag-group-order-section" aria-labelledby="tag-group-order-title"><header><div><strong id="tag-group-order-title">组内标签顺序</strong><span>列表与选择器将使用这个顺序</span></div><small>{groupEditor.tags.length} 个标签</small></header>{groupEditor.tags.length ? <ol className="tag-group-order-list">{groupEditor.tags.map((tag, index) => <li key={tag.id}><span className="tag-order-index">{index + 1}</span><TagBadge size="sm" tag={tag} /><span className="tag-order-spacer" /><div className="tag-order-actions"><Button aria-label={`上移标签 ${tag.name}`} disabled={index === 0} onClick={() => moveGroupTag(tag.id, -1)} size="icon" type="button" variant="ghost"><ArrowUp /></Button><Button aria-label={`下移标签 ${tag.name}`} disabled={index === groupEditor.tags.length - 1} onClick={() => moveGroupTag(tag.id, 1)} size="icon" type="button" variant="ghost"><ArrowDown /></Button><Button aria-label={`从标签组删除 ${tag.name}`} className="tag-order-remove" onClick={() => removeGroupTag(tag.id)} size="icon" type="button" variant="ghost"><Trash2 /></Button></div></li>)}</ol> : <div className="tag-group-order-empty">这个标签组还没有标签</div>}<p className="tag-group-order-note">移除的标签将在保存后从所有任务中删除。</p></section></>}</div>}<DialogFooter className="tag-group-editor-footer">{groupEditor?.id && <Button className="tag-group-editor-delete" onClick={() => { const group = groups.find((item) => item.id === groupEditor.id); if (group) { setGroupEditor(null); setDeleteTarget({ kind: "group", group }); } }} type="button" variant="ghost"><Trash2 data-icon="inline-start" />删除标签组</Button>}<span className="tag-editor-footer-spacer" /><Button onClick={() => setGroupEditor(null)} type="button" variant="ghost">取消</Button><Button disabled={!groupEditor?.name.trim() || groupNameDuplicate} onClick={saveGroup} type="button">{groupEditor?.id ? "保存更改" : "创建标签组"}</Button></DialogFooter></DialogContent></Dialog>

    <AlertDialog onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} open={Boolean(deleteTarget)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{deleteTarget?.kind === "group" ? "删除标签组？" : "删除标签？"}</AlertDialogTitle><AlertDialogDescription>{deleteTarget?.kind === "group" ? `「${deleteTarget.group.name}」中的 ${deleteTarget.group.tags.length} 个标签会同时从任务中移除。` : `「${deleteTarget?.tag.name}」会从所有任务中移除，此操作无法撤销。`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction className="tag-delete-confirm" onClick={confirmDelete}>确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>;
}
