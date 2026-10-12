import type { CSSProperties } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useModuleCopy } from "@/shared/i18n/module-messages";

type Props = { className?: string; disabled?: boolean; onEdit: () => void; onRemove?: () => void; style?: CSSProperties };

/**
 * The hover layer over an editable avatar: "edit" always, "remove" beside it once an image is
 * uploaded (`onRemove` set). A click anywhere else on the layer also edits, as the old button did.
 */
export function AvatarEditActions({ className = "", disabled, onEdit, onRemove, style }: Props) {
  const m = useModuleCopy();
  return <div className={`avatar-edit-overlay ${className}`} onClick={() => { if (!disabled) onEdit(); }} style={style}>
    <button aria-label={m('chooseAnAvatarImage')} disabled={disabled} onClick={(event) => { event.stopPropagation(); onEdit(); }} title={m('chooseAnAvatarImage')} type="button"><Pencil aria-hidden="true" /></button>
    {onRemove && <button aria-label={m('removeAvatar')} disabled={disabled} onClick={(event) => { event.stopPropagation(); onRemove(); }} title={m('removeAvatar')} type="button"><Trash2 aria-hidden="true" /></button>}
  </div>;
}
