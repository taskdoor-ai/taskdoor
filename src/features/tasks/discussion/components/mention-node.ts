import { $applyNodeReplacement, TextNode, type EditorConfig, type LexicalNode, type NodeKey, type SerializedTextNode, type Spread } from "lexical";

export type SerializedMentionNode = Spread<{ personId: string; label: string; type: "discussion-mention"; version: 1 }, SerializedTextNode>;

/** Only a deliberate person selection creates a mention; ordinary text stays text. */
export class MentionNode extends TextNode {
  __personId: string;
  __label: string;

  static getType(): string { return "discussion-mention"; }
  static clone(node: MentionNode): MentionNode { return new MentionNode(node.__personId, node.__label, node.__key); }

  constructor(personId = "", label = "", key?: NodeKey) {
    super(`@${label}`, key);
    this.__personId = personId;
    this.__label = label;
  }

  getPersonId(): string { return this.getLatest().__personId; }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    const className = config.theme.mention ?? "discussion-composer-mention";
    if (typeof className === "string") element.classList.add(...className.split(" ").filter(Boolean));
    element.dataset.mentionId = this.__personId;
    return element;
  }

  updateDOM(previous: this, element: HTMLElement, config: EditorConfig): boolean {
    if (previous.__personId !== this.__personId) element.dataset.mentionId = this.__personId;
    return super.updateDOM(previous, element, config);
  }

  static importJSON(serialized: SerializedMentionNode): MentionNode {
    return $createMentionNode(serialized.personId, serialized.label).updateFromJSON(serialized).setMode("token");
  }

  exportJSON(): SerializedMentionNode {
    return { ...super.exportJSON(), type: "discussion-mention", version: 1, personId: this.__personId, label: this.__label };
  }

  isTextEntity(): true { return true; }
  canInsertTextBefore(): false { return false; }
  canInsertTextAfter(): false { return false; }
}

export function $createMentionNode(personId: string, label: string): MentionNode {
  return $applyNodeReplacement(new MentionNode(personId, label)).setMode("token");
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode { return node instanceof MentionNode; }
