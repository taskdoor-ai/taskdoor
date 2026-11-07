import { $applyNodeReplacement, $getRoot, DecoratorNode, type NodeKey, type SerializedLexicalNode } from "lexical";
import { createContext, useContext, type ReactNode } from "react";
import { useDetailCopy } from "@/shared/i18n/detail-messages";
import { formatDiscussionTaskReference, readDiscussionTaskReference, type DiscussionReferenceTask } from "@/features/tasks/discussion/lib/discussion-task-reference";

type TaskReference = Pick<DiscussionReferenceTask, "id" | "number">;
type SerializedTaskReference = SerializedLexicalNode & { taskId: string; taskNumber: number };

export const DiscussionTaskReferenceTasks = createContext<readonly DiscussionReferenceTask[] | undefined>(undefined);

function TaskReferenceLabel({ id, number }: TaskReference) {
  const task = useContext(DiscussionTaskReferenceTasks)?.find(item => item.id === id);
  const d = useDetailCopy();
  const label = task?.title ?? `#${number}`;
  const unavailable = d("taskReferenceUnavailable");
  return <>
    <span className="discussion-composer-task-reference" data-unavailable={!task || undefined} title={task ? `${label} · #${number}` : `${label} · ${unavailable}`}>{label}</span>
    {!task && <span className="sr-only">{unavailable}</span>}
  </>;
}

export class DiscussionTaskReferenceNode extends DecoratorNode<ReactNode> {
  __taskId: string;
  __taskNumber: number;

  constructor(taskId = "", taskNumber = 0, key?: NodeKey) {
    super(key);
    this.__taskId = taskId;
    this.__taskNumber = taskNumber;
  }

  static getType(): string { return "discussion-task-reference"; }
  static clone(node: DiscussionTaskReferenceNode): DiscussionTaskReferenceNode {
    return new DiscussionTaskReferenceNode(node.__taskId, node.__taskNumber, node.__key);
  }
  static importJSON(node: SerializedTaskReference): DiscussionTaskReferenceNode {
    return $createDiscussionTaskReferenceNode({ id: node.taskId, number: node.taskNumber });
  }
  exportJSON(): SerializedTaskReference {
    return { ...super.exportJSON(), taskId: this.__taskId, taskNumber: this.__taskNumber };
  }
  getTextContent(): string {
    return formatDiscussionTaskReference({ id: this.__taskId, number: this.__taskNumber });
  }
  createDOM(): HTMLElement { return document.createElement("span"); }
  updateDOM(): false { return false; }
  decorate(): ReactNode { return <TaskReferenceLabel id={this.__taskId} number={this.__taskNumber} />; }
}

export function $createDiscussionTaskReferenceNode(reference: TaskReference): DiscussionTaskReferenceNode {
  return $applyNodeReplacement(new DiscussionTaskReferenceNode(reference.id, reference.number));
}

// Older drafts stored references as plain Markdown. Convert only the persisted link syntax.
export function $restoreDiscussionTaskReferences() {
  for (const node of $getRoot().getAllTextNodes()) {
    if (!node.isSimpleText()) continue;
    const matches = [...node.getTextContent().matchAll(/(?<!\\)\[([1-9]\d*)\]\(<(#taskdoor-task=[^>\r\n]+)>\)/g)];
    for (const match of matches.reverse()) {
      const id = readDiscussionTaskReference(match[2]);
      const number = Number(match[1]);
      if (!id || !Number.isSafeInteger(number)) continue;
      const start = match.index;
      const parts = node.splitText(start, start + match[0].length);
      parts[start === 0 ? 0 : 1].replace($createDiscussionTaskReferenceNode({ id, number }));
    }
  }
}
