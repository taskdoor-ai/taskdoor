import { Send, Sparkles, X } from "lucide-react";
import { SmartTextbox, getPlainText, type MentionItem, type Segment } from "@tigerabrodioss/fude";
import React, { useEffect, useRef, useState } from "react";
import { readComposerSelection, replaceMentionRange, type ComposerSelection } from "../lib/mentionComposer";
import { usePersonOptions } from "./PersonDirectory";
import { PersonPicker } from "./PersonPicker";
import { Button } from "./ui/button";

type MentionComposerProps = {
  actionLabel?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onCancel?: () => void;
  onConnectAi?: (draft: string, trigger: HTMLElement) => void;
  onSubmit: (message: string, mentions: string[]) => void;
  people: string[];
  placeholder?: string;
};

export function MentionComposer({ actionLabel = "发送", autoFocus = false, compact = false, onCancel, onConnectAi, onSubmit, people, placeholder = "输入消息，使用 @ 提及协作者…" }: MentionComposerProps) {
  const composerRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const segmentsRef = useRef(segments);
  const selectionRef = useRef<ComposerSelection | null>(null);
  const insertedMentionRef = useRef<string | null>(null);
  const returnFocusRef = useRef(true);
  const members = usePersonOptions(people);
  const editorElement = () => composerRef.current?.querySelector<HTMLElement>('.mention-composer-input[contenteditable="true"]');
  const changeSegments = (next: Segment[]) => {
    segmentsRef.current = next;
    setSegments(next);
  };
  const rememberSelection = () => {
    const editor = editorElement();
    if (!editor || pickerOpen) return;
    const selection = readComposerSelection(editor, segmentsRef.current);
    if (selection) selectionRef.current = selection;
  };
  const restoreEditorFocus = () => {
    if (!returnFocusRef.current) return false;
    window.requestAnimationFrame(() => {
      const editor = editorElement();
      if (!editor?.isConnected) return;
      editor.focus({ preventScroll: true });
      // SmartTextbox moves the caret on focus in a microtask; restore our position after it.
      queueMicrotask(() => {
        if (!editor.isConnected) return;
        const selection = window.getSelection();
        const insertedId = insertedMentionRef.current;
        const chip = insertedId && Array.from(editor.querySelectorAll<HTMLElement>("[data-mention-id]")).find(element => element.dataset.mentionId === insertedId);
        const range = document.createRange();
        if (chip) {
          const spacer = chip.nextSibling;
          if (spacer?.nodeType === Node.TEXT_NODE) {
            const text = spacer.textContent ?? "";
            const sentinelLength = text.startsWith("\u200b") ? 1 : 0;
            const following = spacer.nextSibling;
            if (text[sentinelLength] === " ") range.setStart(spacer, sentinelLength + 1);
            else if (following?.nodeType === Node.TEXT_NODE && following.textContent?.startsWith(" ")) range.setStart(following, 1);
            else range.setStart(spacer, sentinelLength);
          }
          else range.setStartAfter(chip);
          range.collapse(true);
        } else if (selectionRef.current?.range.startContainer.isConnected) {
          selection?.removeAllRanges();
          selection?.addRange(selectionRef.current.range);
          return;
        } else {
          range.selectNodeContents(editor);
          range.collapse(false);
        }
        selection?.removeAllRanges();
        selection?.addRange(range);
        insertedMentionRef.current = null;
      });
    });
    return false;
  };
  const choosePerson = (personId: string) => {
    const person = members.find(member => member.id === personId);
    if (!person) return;
    const item: MentionItem = { id: `${person.id}-${crypto.randomUUID()}`, label: `@${person.name}`, searchValue: `@${person.name}` };
    const end = getPlainText(segmentsRef.current).length;
    const selection = selectionRef.current ?? { start: end, end };
    insertedMentionRef.current = item.id;
    changeSegments(replaceMentionRange(segmentsRef.current, selection, item));
  };
  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    if (event.target !== editorElement()) return;
    rememberSelection();
    const input = event.nativeEvent as InputEvent;
    const selection = selectionRef.current;
    if (input.isComposing || input.inputType !== "insertText" || input.data !== "@" || !selection || selection.start !== selection.end) return;
    if (getPlainText(segmentsRef.current)[selection.start - 1] !== "@") return;
    selectionRef.current = { ...selection, start: selection.start - 1 };
    returnFocusRef.current = true;
    setPickerOpen(true);
  };
  useEffect(() => {
    if (!autoFocus) return;
    composerRef.current?.querySelector<HTMLElement>(".mention-composer-input")?.focus({ preventScroll: true });
  }, [autoFocus]);
  const plainText = getPlainText(segments).trim();
  const submit = (nextSegments = segments) => {
    const message = getPlainText(nextSegments).trim();
    if (!message) return;
    const mentions = nextSegments.filter((segment) => segment.type === "mention").map((segment) => segment.item.searchValue.replace(/^@/, ""));
    onSubmit(message, Array.from(new Set(mentions)));
    changeSegments([]);
    selectionRef.current = null;
  };
  // Interaction and composition adapted from 21st.dev / Ruixen UI / Ruixen Prompt Box.
  return <div className={`mention-composer ruixen-prompt-box ${compact ? "compact" : ""}`} ref={composerRef} onInput={handleInput} onKeyUp={rememberSelection} onMouseUp={rememberSelection} onBlurCapture={rememberSelection} onPointerDownCapture={rememberSelection}>
    <SmartTextbox
      classNames={{
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
      onChange={changeSegments}
      onSubmit={submit}
      placeholder={placeholder}
      value={segments}
    />
    <footer>
      <div className="mention-composer-tools">
        <PersonPicker ariaLabel="提及协作者" className="mention-composer-person-trigger" finalFocus={restoreEditorFocus} members={members} menuLabel="提及协作者" onChange={choosePerson} onOpenChange={(open, details) => {
          if (open) rememberSelection();
          returnFocusRef.current = details?.reason !== "outside-press" && details?.reason !== "focus-out";
          setPickerOpen(open);
        }} open={pickerOpen} triggerVariant="mention" value="" />
        {onConnectAi && <span className="mention-composer-ai-entry"><Button aria-label="连接 AI：当前回复草稿" className="mention-composer-ai-trigger" onClick={(event) => onConnectAi(plainText, event.currentTarget)} size="icon-sm" title="连接 AI" type="button" variant="ai"><Sparkles aria-hidden="true" size={15} /></Button></span>}
      </div>
      <span>{onCancel && <button className="mention-composer-cancel" onClick={onCancel} type="button">取消</button>}<button aria-label={actionLabel} className="mention-composer-submit" disabled={!plainText} onClick={() => submit()} type="button"><span>{actionLabel}</span><Send size={13} /></button></span>
    </footer>
  </div>;
}
