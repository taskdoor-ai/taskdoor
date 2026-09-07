import { getPlainText, type MentionItem, type Segment } from "@tigerabrodioss/fude";

export type ComposerSelection = { start: number; end: number; range: Range };

// Match the editor's plain-text coordinates, ignoring chip decorations and caret sentinels.
export function readComposerSelection(editor: HTMLElement, segments: Segment[]): ComposerSelection | null {
  const selection = editor.ownerDocument.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
  const mentions = new Map(segments.filter(segment => segment.type === "mention").map(segment => [segment.item.id, segment.item.searchValue]));
  const offsetAt = (node: Node, offset: number) => {
    const prefix = editor.ownerDocument.createRange();
    prefix.selectNodeContents(editor);
    prefix.setEnd(node, offset);
    let text = "";
    const walk = (parent: Node, block = false) => {
      for (const child of parent.childNodes) {
        if (child.nodeType === 3) {
          text += (child.textContent ?? "").replaceAll("\u200b", "");
        } else if (child.nodeType === 1) {
          const element = child as HTMLElement;
          const mentionId = element.getAttribute("data-mention-id");
          if (mentionId) text += mentions.get(mentionId) ?? "";
          else if (element.tagName === "BR") {
            if (!block || child.nextSibling) text += "\n";
          } else {
            if (text) text += "\n";
            walk(child, true);
          }
        }
      }
    };
    walk(prefix.cloneContents());
    return text.length;
  };
  return { start: offsetAt(range.startContainer, range.startOffset), end: offsetAt(range.endContainer, range.endOffset), range: range.cloneRange() };
}

export function replaceMentionRange(segments: Segment[], range: { start: number; end: number }, item: MentionItem): Segment[] {
  const slice = (start: number, end: number) => {
    let offset = 0;
    const result: Segment[] = [];
    for (const segment of segments) {
      const text = segment.type === "text" ? segment.value : segment.item.searchValue;
      const from = Math.max(0, start - offset);
      const to = Math.min(text.length, end - offset);
      if (from < to) result.push(segment.type === "text" ? { type: "text", value: text.slice(from, to) } : segment);
      offset += text.length;
    }
    return result;
  };
  const length = getPlainText(segments).length;
  const start = Math.max(0, Math.min(range.start, length));
  const end = Math.max(start, Math.min(range.end, length));
  const after = slice(end, length);
  const separator: Segment[] = /^\s/.test(getPlainText(after)) ? [] : [{ type: "text", value: " " }];
  return [...slice(0, start), { type: "mention", item }, ...separator, ...after];
}
