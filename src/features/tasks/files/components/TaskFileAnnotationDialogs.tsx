import { useEffect, useId, useMemo, useRef, useState, type ComponentProps } from "react";
import { SquareDashedMousePointer, Pencil, Check, X, Trash2 } from "lucide-react";
import type { TaskFileNode } from "@/shared/model/task-model";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/input";
import { Popover, PopoverContent } from "@/shared/ui/popover";
import { type TaskFileAnnotation, type TaskFileAnnotationAnchor } from "@/features/tasks/files/lib/task-file-annotations";
import { FileAnnotationSourcePreview } from "@/features/tasks/files/components/FileAnnotationSourcePreview";
import { useAnnotationFullscreenContainer } from "@/features/tasks/files/lib/useAnnotationFullscreenContainer";

export type FileAnnotationDraft = { file: TaskFileNode; anchor: TaskFileAnnotationAnchor; body: string; capturePending?: boolean; captureId?: string; position?: { left: number; top: number } };

export function TaskFileAnnotationComposer({ draft, onChange, onClose, onSubmit }: {
  draft: FileAnnotationDraft | null; onChange: (body: string) => void; onClose: () => void; onSubmit: () => void;
}) {
  const { locale } = useI18n();
  const portalContainer = useAnnotationFullscreenContainer();
  const t = (zh: string, en: string) => locale === "en" ? en : zh;
  const [error, setError] = useState("");
  const titleId = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const anchor = useMemo(() => ({ getBoundingClientRect: () => new DOMRect(draft?.position?.left ?? 24, draft?.position?.top ?? 120, 1, 1) }), [draft?.position?.left, draft?.position?.top]);
  const close = () => { setError(""); onClose(); };
  const submit = () => {
    if (!draft?.body.trim() || draft.capturePending) return;
    try { onSubmit(); setError(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : t("标注保存失败", "Annotation could not be saved")); }
  };
  return <Popover modal={false} open={Boolean(draft)} onOpenChange={(open, details) => {
    if (open) return;
    if (details.reason === "outside-press" || details.reason === "focus-out") { details.cancel(); details.allowPropagation(); return; }
    close();
  }}><PopoverContent align="start" anchor={anchor} aria-labelledby={titleId} className="task-file-annotation-popover task-file-annotation-composer" collisionPadding={12} data-annotation-overlay finalFocus={false} initialFocus={input} portalContainer={portalContainer} positionMethod="fixed" sideOffset={8}>
    <header className="task-file-annotation-popover-header"><h2 id={titleId}><SquareDashedMousePointer aria-hidden="true" size={15} />{t("添加标注", "Add annotation")}</h2><Button aria-label={t("关闭标注", "Close annotation")} onClick={close} size="icon-xs" type="button" variant="ghost"><X aria-hidden="true" size={15} /></Button></header>
    {draft && <><div className="task-file-annotation-composer-target"><span title={draft.anchor.elementLabel ?? draft.anchor.location}>{draft.anchor.elementLabel ?? draft.anchor.location}</span><small title={draft.file.name}>{draft.file.name} · v{draft.file.version ?? 1}</small></div><div className="task-file-annotation-composer-preview"><FileAnnotationSourcePreview file={draft.file} anchor={draft.anchor} /></div></>}
    <form onSubmit={event => { event.preventDefault(); submit(); }}><Textarea aria-label={t("修改意见", "Change request")} onChange={event => { onChange(event.target.value); setError(""); }} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} placeholder={t("希望这里怎么改？", "What should change here?")} ref={input} rows={3} value={draft?.body ?? ""} />{error && <p className="task-file-annotation-error" role="alert">{error}</p>}<footer className="task-file-annotation-composer-footer"><Button onClick={close} size="sm" type="button" variant="ghost">{t("取消", "Cancel")}</Button><Button disabled={!draft?.body.trim() || draft.capturePending} size="sm" type="submit">{draft?.capturePending ? t("正在生成局部预览…", "Preparing preview…") : t("添加标注", "Add annotation")}</Button></footer></form>
  </PopoverContent></Popover>;
}

type FeedbackEditDraft = { body: string; error: string };

export function TaskFileAnnotationBasket({ open, onClose, onOpenChange, anchor, handle, triggerId, compact = false, annotations, onRemove, onLocate, actorId, onEdit, onPendingEditChange }: {
  open: boolean; onClose: () => void; annotations: TaskFileAnnotation[];
  actorId: string; onEdit: (id: string, body: string) => void; onRemove: (id: string) => void; onLocate: (item: TaskFileAnnotation) => void;
  anchor?: HTMLElement | null; handle?: ComponentProps<typeof Popover>["handle"]; triggerId?: string; onOpenChange?: (open: boolean) => void; compact?: boolean;
  onPendingEditChange?: (pending: boolean) => void;
}) {
  const { locale } = useI18n();
  const portalContainer = useAnnotationFullscreenContainer();
  const t = (zh: string, en: string) => locale === "en" ? en : zh;
  const [editDrafts, setEditDrafts] = useState<Record<string, FeedbackEditDraft>>({});
  const titleId = useId();
  const pending = Object.entries(editDrafts).some(([id, draft]) => draft.body !== annotations.find(item => item.id === id)?.body);
  useEffect(() => { onPendingEditChange?.(pending); }, [pending, onPendingEditChange]);
  useEffect(() => () => { onPendingEditChange?.(false); }, [onPendingEditChange]);
  const updateEditDraft = (id: string, draft: FeedbackEditDraft | null) => setEditDrafts(current => {
    const next = { ...current };
    if (draft) next[id] = draft;
    else delete next[id];
    return next;
  });
  const close = () => { setEditDrafts({}); onClose(); };
  return <Popover handle={handle} modal={false} open={open} triggerId={triggerId} onOpenChange={(next, details) => {
    details.allowPropagation();
    if (!next && (details.reason === "escape-key" || details.reason === "close-press")) setEditDrafts({});
    if (onOpenChange) onOpenChange(next);
    else if (!next) onClose();
  }}><PopoverContent align={compact ? "start" : "end"} anchor={anchor} aria-labelledby={titleId} className={`task-file-annotation-popover task-file-annotation-basket${compact ? " is-toolbar-list" : ""}`} collisionPadding={12} data-annotation-overlay finalFocus={false} initialFocus={false} portalContainer={portalContainer} positionMethod="fixed" side={compact ? "top" : "bottom"} sideOffset={8}>
    <header className="task-file-annotation-popover-header"><h2 id={titleId}>{t("标注", "Annotations")} <small>{annotations.length}</small></h2><Button aria-label={t("关闭标注列表", "Close annotations")} onClick={close} size="icon-xs" type="button" variant="ghost"><X aria-hidden="true" size={15} /></Button></header>
    <div className="task-file-annotation-basket-body"><div className="task-file-annotation-basket-index compact-list">{annotations.map(item => <FeedbackBasketRow key={item.id} item={item} editable={item.authorId === actorId} editDraft={editDrafts[item.id]} onEditDraftChange={draft => updateEditDraft(item.id, draft)} onEdit={body => onEdit(item.id, body)} onRemove={() => { onRemove(item.id); updateEditDraft(item.id, null); }} onLocate={() => { onClose(); onLocate(item); }} />)}</div></div>
  </PopoverContent></Popover>;
}

function FeedbackBasketRow({ item, editable, editDraft, onEditDraftChange, onEdit, onRemove, onLocate }: { item: TaskFileAnnotation; editable: boolean; editDraft?: FeedbackEditDraft; onEditDraftChange: (draft: FeedbackEditDraft | null) => void; onEdit: (body: string) => void; onRemove: () => void; onLocate: () => void }) {
  const { locale } = useI18n();
  const t = (zh: string, en: string) => locale === "en" ? en : zh;
  const input = useRef<HTMLTextAreaElement>(null);
  const label = item.anchor.elementLabel ?? (item.anchor.kind === "text" ? t("文字", "Text") : item.anchor.kind === "region" ? t("区域", "Region") : t("整份文件", "Whole file"));
  return <section className="task-file-feedback-row">
    <div className="task-file-feedback-row-heading"><button className="task-file-feedback-source" onClick={onLocate} title={`${item.fileName} · v${item.version} · ${item.anchor.location}`} type="button"><FileAnnotationSourcePreview compact file={item.source} anchor={item.anchor} /><span className="task-file-feedback-target">{label}</span></button><div className="task-file-feedback-row-actions">
      {editable && <Button aria-label={t("编辑意见", "Edit feedback")} onClick={() => { if (!editDraft) onEditDraftChange({ body: item.body, error: "" }); requestAnimationFrame(() => input.current?.focus({ preventScroll: true })); }} size="icon-xs" variant="ghost"><Pencil size={15} /></Button>}
      <Button aria-label={t("删除标注", "Delete annotation")} disabled={!editable} onClick={onRemove} size="icon-xs" variant="ghost"><Trash2 size={15} /></Button>
    </div></div>
    {editDraft ? <form onSubmit={event => { event.preventDefault(); try { onEdit(editDraft.body); onEditDraftChange(null); } catch (failure) { onEditDraftChange({ ...editDraft, error: failure instanceof Error ? failure.message : t("保存失败，请重试。", "Could not save. Please retry.") }); } }}><Textarea aria-label={t("编辑修改意见", "Edit change request")} onChange={event => onEditDraftChange({ body: event.target.value, error: "" })} ref={input} rows={2} value={editDraft.body} /><div className="task-file-feedback-edit-actions"><Button aria-label={t("取消编辑意见", "Cancel editing feedback")} onClick={() => onEditDraftChange(null)} size="icon-xs" type="button" variant="ghost"><X size={14} /></Button><Button aria-label={t("保存意见", "Save feedback")} disabled={!editDraft.body.trim()} size="icon-xs" type="submit" variant="ghost"><Check size={14} /></Button></div>{editDraft.error && <p role="alert">{editDraft.error}</p>}</form> : <p className="task-file-feedback-opinion">{item.body}</p>}

  </section>;
}
