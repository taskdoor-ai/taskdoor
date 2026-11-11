import { Check, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { TagAppearancePicker } from "@/features/me/components/TagAppearancePicker";
import { useTagReorder } from "@/features/me/lib/useTagReorder";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import type { TagDefinition } from "@/shared/model/task-model";
import { TagBadge } from "@/shared/ui/TagBadge";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

type Props = {
  tags: TagDefinition[];
  onChange: (tags: TagDefinition[]) => void;
  canManage?: boolean;
  canCreate?: boolean;
  canManageTag?: (tag: TagDefinition) => boolean;
  canDeleteTag?: (tag: TagDefinition) => boolean;
  onDeleteTag?: (id: string) => void;
  getTagUsageCount?: (tag: TagDefinition) => number;
  loadError?: string;
  onRetry?: () => void;
};

type EditorState = Omit<TagDefinition, "id"> & { id?: string };
type TagAction = { type: "create" | "rename" | "appearance"; draft: EditorState } | { type: "delete"; id: string };

const tagNameKey = (name: string) => name.trim().normalize("NFKC").toLowerCase();

export function TagManagementPage({ onChange, tags, canManage = true, canCreate = canManage, canManageTag = () => canManage, canDeleteTag, onDeleteTag, getTagUsageCount, loadError, onRetry }: Props) {
  const ui = useGlobalUi();
  const [pendingAction, setAction] = useState<TagAction | null>(null);
  const [error, setError] = useState("");
  const [appearanceOpen, setCreateAppearanceOpen] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const canDelete = (tag: TagDefinition) => Boolean(onDeleteTag && canDeleteTag?.(tag));
  const canUseAction = (candidate: TagAction) => {
    if (candidate.type === "create") return canCreate;
    if (candidate.type === "delete") return tags.some(tag => tag.id === candidate.id && canDelete(tag));
    return tags.some(tag => tag.id === candidate.draft.id && canManageTag(tag));
  };
  const action = pendingAction && canUseAction(pendingAction) ? pendingAction : null;
  const createAppearanceOpen = action?.type === "create" && appearanceOpen;
  const editor = action && action.type !== "delete" ? action.draft : null;
  const tagNameDuplicate = Boolean(editor && tags.some(tag => tagNameKey(tag.name) === tagNameKey(editor.name) && tag.id !== editor.id));
  const nameError = tagNameDuplicate ? "该标签名称已存在" : error;
  const { cancel: cancelReorder, drag, getHandleProps, message } = useTagReorder({ tags, onChange, disabled: !canManage || Boolean(action), listRef, onError: setError });

  const startAction = (next: TagAction, trigger: HTMLButtonElement | null = null) => {
    if (!canUseAction(next)) return;
    returnFocus.current = trigger;
    setError("");
    setCreateAppearanceOpen(false);
    setAction(next);
  };

  const closeAction = (focus: HTMLButtonElement | null = returnFocus.current) => {
    setAction(null);
    setCreateAppearanceOpen(false);
    setError("");
    if (focus) requestAnimationFrame(() => focus.focus({ preventScroll: true }));
  };

  const updateDraft = (patch: Partial<EditorState>) => {
    if (!action || action.type === "delete") return;
    setError("");
    setAction({ ...action, draft: { ...action.draft, ...patch } });
  };

  const saveTag = (focus = returnFocus.current) => {
    if (!editor) return;
    const name = action?.type === "appearance" ? editor.name : editor.name.trim();
    if (!name) {
      setError("名称不能为空");
      return;
    }
    if (action?.type !== "appearance" && tagNameDuplicate) return;
    if (action?.type === "rename" && tags.find(tag => tag.id === editor.id)?.name === name) {
      closeAction(focus);
      return;
    }
    try {
      const nextTag = { ...editor, id: editor.id ?? crypto.randomUUID(), name };
      onChange(editor.id ? tags.map(tag => tag.id === editor.id ? nextTag : tag) : [nextTag, ...tags]);
      closeAction(focus);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "标签未能保存，请重试。");
    }
  };

  const deleteTag = (id: string) => {
    if (!onDeleteTag || !canUseAction({ type: "delete", id })) return;
    try {
      const row = returnFocus.current?.closest("li");
      const nextRow = row?.nextElementSibling ?? row?.previousElementSibling;
      onDeleteTag(id);
      closeAction(nextRow?.querySelector<HTMLButtonElement>(".tag-list-name, .tag-list-delete:not(:disabled)") ?? createButton.current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "标签未能删除，请重试。");
    }
  };

  const createRow = canCreate && action?.type === "create" && editor && <li className="tag-list-create">
    <form aria-label={ui("新建标签")} className="tag-list-row" onSubmit={event => {
      event.preventDefault();
      saveTag();
    }}>
      {canManage && <span aria-hidden="true" className="tag-list-handle-spacer" />}
      <Popover open={createAppearanceOpen} onOpenChange={setCreateAppearanceOpen}>
        <TagBadge
          size="sm"
          tag={{ ...editor, id: "new-tag", name: editor.name.trim() || ui("新建标签") }}
          renderIcon={(icon, name) => <PopoverTrigger aria-label={ui("修改标签图标和底色：{0}", {0: name})} className="tag-list-icon" type="button">{icon}</PopoverTrigger>}
          renderName={() => <input
            aria-describedby={nameError ? "tag-create-error" : undefined}
            aria-invalid={Boolean(nameError)}
            aria-label={ui("名称")}
            autoFocus
            className="tag-list-name-input"
            enterKeyHint="done"
            maxLength={24}
            onChange={event => updateDraft({ name: event.target.value })}
            placeholder={ui("新建标签")}
            value={editor.name}
          />}
        />
        <PopoverContent aria-label={ui("编辑标签：{0}", {0: editor.name.trim() || ui("新建标签")})} className="tag-appearance-popover">
          <TagAppearancePicker color={editor.color} icon={editor.icon} onColorChange={color => updateDraft({ color })} onIconChange={icon => updateDraft({ icon })} />
        </PopoverContent>
      </Popover>
      <Button aria-label={ui("创建标签")} disabled={!editor.name.trim() || tagNameDuplicate} size="icon-sm" title={ui("创建标签")} type="submit"><Check aria-hidden="true" /></Button>
      <Button aria-label={ui("取消")} onClick={() => closeAction()} size="icon-sm" title={ui("取消")} type="button" variant="ghost"><X aria-hidden="true" /></Button>
    </form>
    {nameError && <p className="tag-editor-field-error tag-list-name-error" id="tag-create-error" role="alert">{ui(nameError)}</p>}
  </li>;

  return <div onKeyDown={event => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
    if (!drag && (!action || action.type === "appearance" || createAppearanceOpen)) return;
    event.preventDefault();
    event.stopPropagation();
    if (drag) cancelReorder();
    else closeAction();
  }}>
    <div className="tag-management-content">
      <header className="tag-management-heading">
        <div className="tag-management-title"><h2 id="team-tags-title">{ui("团队标签")}</h2>{!loadError && <span>{tags.length}{ui("个标签")}</span>}</div>
        {canCreate && <Button aria-expanded={action?.type === "create"} onClick={event => {
          if (action?.type === "create") return;
          startAction({ type: "create", draft: { name: "", icon: "tag", color: "blue" } }, event.currentTarget);
        }} ref={createButton} size="sm" type="button" variant="default"><Plus data-icon="inline-start" />{ui("新建标签")}</Button>}
      </header>

      {canManage && <span className="sr-only" id="tag-sort-instructions">{ui("拖动排序，或用方向键移动")}</span>}
      <span aria-live="polite" className="sr-only" role="status">{message}</span>
      {!action && error && <p className="tag-editor-field-error" role="alert">{ui(error)}</p>}
      {loadError ? <div className="tag-management-load-error">
        <p className="tag-editor-field-error" role="alert">{ui(loadError)}</p>
        {onRetry && <Button onClick={onRetry} size="sm" type="button" variant="outline">{ui("重试")}</Button>}
      </div> : tags.length || createRow ? <ul aria-label={ui("团队标签列表")} className="tag-list" ref={listRef}>
        {createRow}
        {tags.map(tag => {
          const manageable = canManageTag(tag);
          const deletable = canDelete(tag);
          const deleteLabel = ui("删除标签：{0}", {0: tag.name});
          const renaming = action?.type === "rename" && action.draft.id === tag.id;
          const appearance = action?.type === "appearance" && action.draft.id === tag.id ? action.draft : null;
          const deleting = action?.type === "delete" && action.id === tag.id;
          const usageCount = deleting ? getTagUsageCount?.(tag) : undefined;
          const dragging = drag?.id === tag.id;
          return <li data-tag-id={tag.id} data-dragging={dragging || undefined} data-drop-position={drag?.targetId === tag.id ? drag.placement : undefined} key={tag.id}>
            <div className="tag-list-row" style={dragging ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}>
              {canManage && <button {...getHandleProps(tag)} aria-describedby="tag-sort-instructions" aria-label={ui("拖动排序：{0}", {0: tag.name})} className="tag-list-drag-handle" disabled={Boolean(action) || tags.length < 2} title={ui("拖动排序，或用方向键移动")} type="button"><GripVertical aria-hidden="true" /></button>}
              {manageable ? <Popover open={Boolean(appearance)} onOpenChange={open => {
                if (open) startAction({ type: "appearance", draft: tag });
                else setAction(current => current?.type === "appearance" && current.draft.id === tag.id ? null : current);
              }}>
                <TagBadge
                  size="sm"
                  tag={appearance ? { ...tag, icon: appearance.icon, color: appearance.color } : tag}
                  renderIcon={(icon, name) => {
                    const label = ui("修改标签图标和底色：{0}", {0: name});
                    return <PopoverTrigger aria-label={label} className="tag-list-icon" title={label} type="button">{icon}</PopoverTrigger>;
                  }}
                  renderName={name => <>
                    <button aria-label={ui("修改标签名称：{0}", {0: name})} className="tag-list-name" hidden={renaming} onClick={event => {
                      startAction({ type: "rename", draft: tag }, event.currentTarget);
                    }} title={ui("修改标签名称：{0}", {0: name})} type="button">{name}</button>
                    {renaming && editor && <input
                      aria-describedby={nameError ? "tag-rename-error" : undefined}
                      aria-invalid={Boolean(nameError)}
                      aria-label={ui("名称")}
                      className="tag-list-name-input"
                      enterKeyHint="done"
                      maxLength={24}
                      onBlur={() => saveTag(null)}
                      onChange={event => updateDraft({ name: event.target.value })}
                      onFocus={event => event.currentTarget.select()}
                      onKeyDown={event => {
                        if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                        event.preventDefault();
                        saveTag();
                      }}
                      autoFocus
                      value={editor.name}
                    />}
                  </>}
                />
                <PopoverContent aria-label={ui("编辑标签：{0}", {0: tag.name})} className="tag-appearance-popover">
                  {appearance && <form onSubmit={event => {
                    event.preventDefault();
                    saveTag(null);
                  }}>
                    <TagAppearancePicker
                      color={appearance.color}
                      icon={appearance.icon}
                      onColorChange={color => updateDraft({ color })}
                      onIconChange={icon => updateDraft({ icon })}
                    />
                    {error && <p className="tag-editor-field-error" role="alert">{ui(error)}</p>}
                    <div className="tag-inline-actions">
                      <Button disabled={appearance.color === tag.color && appearance.icon === tag.icon} size="sm" type="submit">{ui("保存更改")}</Button>
                    </div>
                  </form>}
                </PopoverContent>
              </Popover> : <TagBadge renderIcon={icon => <span className="tag-list-icon-display">{icon}</span>} size="sm" tag={tag} />}
              <Button aria-expanded={deletable ? deleting : undefined} aria-label={deleteLabel} className="tag-list-delete" disabled={!deletable} onClick={event => {
                if (!deleting) startAction({ type: "delete", id: tag.id }, event.currentTarget);
              }} size="icon-sm" title={deleteLabel} type="button" variant="ghost"><Trash2 aria-hidden="true" /></Button>
            </div>
            {renaming && nameError && <p className="tag-editor-field-error tag-list-name-error" id="tag-rename-error" role="alert">{ui(nameError)}</p>}
            {deleting && <div className="tag-inline-delete">
              <p>{usageCount ? ui("删除「{0}」？此标签将从 {1} 条任务中移除。", {0: tag.name, 1: usageCount}) : ui("删除标签「{0}」？", {0: tag.name})}</p>
              {error && <p className="tag-editor-field-error" role="alert">{ui(error)}</p>}
              <div className="tag-inline-actions">
                <Button autoFocus onClick={() => closeAction()} size="sm" type="button" variant="ghost">{ui("取消")}</Button>
                <Button className="tag-delete-confirm" onClick={() => deleteTag(tag.id)} size="sm" type="button" variant="destructive">{ui("确认删除")}</Button>
              </div>
            </div>}
          </li>;
        })}
      </ul> : !editor && <p className="tag-management-empty">{ui("还没有标签")}</p>}
    </div>
  </div>;
}
