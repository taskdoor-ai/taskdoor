import { Archive, ArrowLeft, Check, GripVertical, Plus, X } from "lucide-react";
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
  onBack: () => void;
  onChange: (tags: TagDefinition[]) => void;
  canManage?: boolean;
  canCreate?: boolean;
  canManageTag?: (tag: TagDefinition) => boolean;
};

type EditorState = Omit<TagDefinition, "id"> & { id?: string };
type TagAction = { type: "create" | "rename" | "appearance"; draft: EditorState } | { type: "archive"; id: string };

const tagNameKey = (name: string) => name.trim().normalize("NFKC").toLowerCase();

export function TagManagementPage({ onBack, onChange, tags, canManage = true, canCreate = canManage, canManageTag = () => canManage }: Props) {
  const ui = useGlobalUi();
  const [pendingAction, setAction] = useState<TagAction | null>(null);
  const [error, setError] = useState("");
  const [appearanceOpen, setCreateAppearanceOpen] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const canUseAction = (candidate: TagAction) => {
    if (candidate.type === "create") return canCreate;
    const id = candidate.type === "archive" ? candidate.id : candidate.draft.id;
    return tags.some(tag => tag.id === id && canManageTag(tag));
  };
  const action = pendingAction && canUseAction(pendingAction) ? pendingAction : null;
  const createAppearanceOpen = action?.type === "create" && appearanceOpen;
  const editor = action && action.type !== "archive" ? action.draft : null;
  const tagNameDuplicate = Boolean(editor && tags.some(tag => tagNameKey(tag.name) === tagNameKey(editor.name) && tag.id !== editor.id));
  const nameError = tagNameDuplicate ? "该标签名称已存在" : error;
  const { drag, getHandleProps, message } = useTagReorder({ tags, onChange, disabled: !canManage || Boolean(action), listRef, onError: setError });

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
    if (!action || action.type === "archive") return;
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

  const archiveTag = (id: string) => {
    if (!canUseAction({ type: "archive", id })) return;
    try {
      const row = returnFocus.current?.closest("li");
      const nextRow = row?.nextElementSibling ?? row?.previousElementSibling;
      onChange(tags.filter(tag => tag.id !== id));
      closeAction(nextRow?.querySelector<HTMLButtonElement>(".tag-list-name") ?? createButton.current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "标签未能归档，请重试。");
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

  return <article className="tag-management-page" onKeyDown={event => {
    if (action && action.type !== "appearance" && !createAppearanceOpen && event.key === "Escape" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      closeAction();
    }
  }}>
    <div className="tag-management-content">
      <Button className="tag-management-back" onClick={onBack} size="sm" type="button" variant="ghost"><ArrowLeft data-icon="inline-start" />{ui("返回")}</Button>
      <header className="tag-management-heading">
        <div className="tag-management-title"><h1>{ui("团队标签")}</h1><span>{tags.length}{ui("个标签")}</span></div>
        {canCreate && <Button aria-expanded={action?.type === "create"} onClick={event => {
          if (action?.type === "create") return;
          startAction({ type: "create", draft: { name: "", icon: "tag", color: "blue" } }, event.currentTarget);
        }} ref={createButton} size="sm" type="button" variant="default"><Plus data-icon="inline-start" />{ui("新建标签")}</Button>}
      </header>

      {canManage && <span className="sr-only" id="tag-sort-instructions">{ui("拖动排序，或用方向键移动")}</span>}
      <span aria-live="polite" className="sr-only" role="status">{message}</span>
      {!action && error && <p className="tag-editor-field-error" role="alert">{ui(error)}</p>}
      {tags.length || createRow ? <ul aria-label={ui("团队标签列表")} className="tag-list" ref={listRef}>
        {createRow}
        {tags.map(tag => {
          if (!canManageTag(tag)) return <li key={tag.id}><div className="tag-list-row"><TagBadge renderIcon={icon => <span className="tag-list-icon-display">{icon}</span>} size="sm" tag={tag} /></div></li>;
          const renaming = action?.type === "rename" && action.draft.id === tag.id;
          const appearance = action?.type === "appearance" && action.draft.id === tag.id ? action.draft : null;
          const archiving = action?.type === "archive" && action.id === tag.id;
          const dragging = drag?.id === tag.id;
          return <li data-tag-id={tag.id} data-dragging={dragging || undefined} data-drop-position={drag?.targetId === tag.id ? drag.placement : undefined} key={tag.id}>
            <div className="tag-list-row" style={dragging ? { transform: `translate(${drag.x}px, ${drag.y}px)` } : undefined}>
              {canManage && <button {...getHandleProps(tag)} aria-describedby="tag-sort-instructions" aria-label={ui("拖动排序：{0}", {0: tag.name})} className="tag-list-drag-handle" disabled={Boolean(action) || tags.length < 2} title={ui("拖动排序，或用方向键移动")} type="button"><GripVertical aria-hidden="true" /></button>}
              <Popover open={Boolean(appearance)} onOpenChange={open => {
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
              </Popover>
              <Button aria-expanded={archiving} aria-label={ui("归档标签：{0}", {0: tag.name})} className="tag-list-delete" onClick={event => {
                if (!archiving) startAction({ type: "archive", id: tag.id }, event.currentTarget);
              }} size="icon-sm" title={ui("归档标签：{0}", {0: tag.name})} type="button" variant="ghost"><Archive aria-hidden="true" /></Button>
            </div>
            {renaming && nameError && <p className="tag-editor-field-error tag-list-name-error" id="tag-rename-error" role="alert">{ui(nameError)}</p>}
            {archiving && <div className="tag-inline-delete">
              <p>{ui("归档「{0}」？任务上已有的标签会保留。", {0: tag.name})}</p>
              {error && <p className="tag-editor-field-error" role="alert">{ui(error)}</p>}
              <div className="tag-inline-actions">
                <Button autoFocus onClick={() => closeAction()} size="sm" type="button" variant="ghost">{ui("取消")}</Button>
                <Button onClick={() => archiveTag(tag.id)} size="sm" type="button" variant="destructive">{ui("确认归档")}</Button>
              </div>
            </div>}
          </li>;
        })}
      </ul> : !editor && <p className="tag-management-empty">{ui("还没有标签")}</p>}
    </div>
  </article>;
}
