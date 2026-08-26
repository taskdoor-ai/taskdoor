import { AtSign, Send, X } from "lucide-react";
import { SmartTextbox, fuzzyFilter, getPlainText, type MentionItem, type Segment } from "@tigerabrodioss/fude";
import { useMemo, useRef, useState } from "react";
import { PersonAvatar } from "./PersonAvatar";

type MentionComposerProps = {
  actionLabel?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onCancel?: () => void;
  onSubmit: (message: string, mentions: string[]) => void;
  people: string[];
  placeholder?: string;
};

export function MentionComposer({ actionLabel = "发送", compact = false, onCancel, onSubmit, people, placeholder = "输入消息，使用 @ 提及协作者…" }: MentionComposerProps) {
  const composerRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const mentionItems = useMemo<MentionItem[]>(() => people.map((person) => ({
    icon: <PersonAvatar name={person} size="xs" />,
    id: person,
    label: `@${person}`,
    searchValue: person,
  })), [people]);
  const plainText = getPlainText(segments).trim();
  const submit = (nextSegments = segments) => {
    const message = getPlainText(nextSegments).trim();
    if (!message) return;
    const mentions = nextSegments.filter((segment) => segment.type === "mention").map((segment) => segment.item.searchValue);
    onSubmit(message, Array.from(new Set(mentions)));
    setSegments([]);
  };
  const openMentionPicker = () => {
    const editor = composerRef.current?.querySelector<HTMLElement>(".mention-composer-input");
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (!selection?.anchorNode || !editor.contains(selection.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    document.execCommand("insertText", false, "@");
  };

  // Interaction and composition adapted from 21st.dev / Ruixen UI / Ruixen Prompt Box.
  return <div className={`mention-composer ruixen-prompt-box ${compact ? "compact" : ""}`} ref={composerRef}>
    <SmartTextbox
      classNames={{
        dropdown: "mention-composer-dropdown",
        dropdownItem: "mention-composer-dropdown-item",
        input: "mention-composer-input",
        root: "mention-composer-editor",
        tag: "mention-composer-tag",
        tagWrapper: "mention-composer-tag-wrapper",
        tagDeleteIcon: "mention-composer-tag-delete",
        tagHighlighted: "mention-composer-tag-highlighted",
        tagIcon: "mention-composer-tag-icon",
      }}
      defaultTagDeleteIcon={<X size={10} />}
      multiline
      onChange={setSegments}
      onFetchMentions={async (query) => fuzzyFilter(query, mentionItems)}
      onSubmit={submit}
      placeholder={placeholder}
      value={segments}
    />
    <footer>
      <div className="mention-composer-tools">
        <button aria-label="提及协作者" onClick={openMentionPicker} onMouseDown={(event) => event.preventDefault()} title="提及协作者" type="button"><AtSign size={16} /></button>
      </div>
      <span>{onCancel && <button className="mention-composer-cancel" onClick={onCancel} type="button">取消</button>}<button aria-label={actionLabel} className="mention-composer-submit" disabled={!plainText} onClick={() => submit()} type="button"><span>{actionLabel}</span><Send size={13} /></button></span>
    </footer>
  </div>;
}
