import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ALL_TASK_MEMBERS_MENTION_ID } from "@/features/tasks/lib/task-collaboration";
import { detailEn, detailZh } from "@/shared/i18n/detail-messages";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { PersonName } from "@/shared/ui/PersonAvatar";
import { usePersonOptions } from "@/shared/ui/PersonDirectory";
import { isDiscussionTaskReference, readDiscussionTaskReference, type DiscussionReferenceTask } from "@/features/tasks/discussion/lib/discussion-task-reference";
import "@/features/tasks/styles/discussion-markdown.css";

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  data?: { hName: string; hProperties: Record<string, string> };
};
type MentionOptions = { names: Map<string, string>; pattern: RegExp | null };

// Transform only prose: code, link labels and image descriptions keep their literal text.
function discussionProsePlugin({ names, pattern }: MentionOptions) {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (!node.children || ["code", "inlineCode", "link", "linkReference", "image", "imageReference", "html"].includes(node.type)) return;
      node.children = node.children.flatMap(child => {
        if (child.type !== "text" || !child.value) { visit(child); return [child]; }
        const parts = pattern ? child.value.split(pattern) : [child.value];
        return parts.flatMap<MarkdownNode>(part => {
          const personId = names.get(part);
          if (personId) return [{ type: "discussionMention", children: [{ type: "text", value: part.slice(1) }], data: { hName: "span", hProperties: { "data-discussion-person": personId, "data-discussion-name": part.slice(1) } } }];
          return part.split("\n").flatMap<MarkdownNode>((line, index) => [...(index ? [{ type: "break" }] : []), ...(line ? [{ type: "text", value: line }] : [])]);
        });
      });
    };
    visit(tree);
  };
}

const components: Components = {
  img: ({ src, alt, title }) => src ? <a href={src} target="_blank" rel="noopener noreferrer" title={title}>{alt || src}</a> : <>{alt}</>,
  span: ({ node, children }) => {
    const personId = node?.properties["data-discussion-person"];
    const name = node?.properties["data-discussion-name"];
    if (typeof personId !== "string" || typeof name !== "string") return <span>{children}</span>;
    return <span className="discussion-saved-mention">@{personId === ALL_TASK_MEMBERS_MENTION_ID ? name : <PersonName name={name} personId={personId} />}</span>;
  },
};

export function DiscussionMarkdown({ text, mentionedPrincipalIds = [], mentionsAllTaskMembers = false, referenceTasks, onOpenReferenceTask }: {
  text: string;
  mentionedPrincipalIds?: string[];
  mentionsAllTaskMembers?: boolean;
  referenceTasks?: DiscussionReferenceTask[];
  onOpenReferenceTask?: (id: string) => void;
}) {
  const ui = useGlobalUi();
  const { locale } = useI18n();
  const people = usePersonOptions(mentionedPrincipalIds);
  const mentions = useMemo(() => {
    const names = new Map(people.flatMap(person => [[`@${person.name}`, person.id], [`@${person.id}`, person.id]]));
    if (mentionsAllTaskMembers) {
      names.set(`@${detailZh.mentionAllTaskMembers}`, ALL_TASK_MEMBERS_MENTION_ID);
      names.set(`@${detailEn.mentionAllTaskMembers}`, ALL_TASK_MEMBERS_MENTION_ID);
    }
    const escaped = [...names.keys()].sort((a, b) => b.length - a.length).map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return { names, pattern: escaped.length ? new RegExp(`(${escaped.join("|")})`, "g") : null };
  }, [people, mentionsAllTaskMembers]);
  return <div className="discussion-markdown"><ReactMarkdown components={{
    ...components,
    a: ({ children, href, title }) => {
      if (!isDiscussionTaskReference(href)) return href ? <a href={href} target="_blank" rel="noopener noreferrer" title={title}>{children}</a> : <>{children}</>;
      const taskId = readDiscussionTaskReference(href);
      const task = referenceTasks?.find(item => item.id === taskId);
      if (!task || !onOpenReferenceTask) return <span className="discussion-task-reference-unavailable">{children}{locale === "en" ? " (task unavailable)" : "（任务不可用）"}</span>;
      const label = locale === "en" ? `Open task ${task.number} ${task.title}` : `打开任务 ${task.number} ${task.title}`;
      return <button aria-label={label} className="discussion-task-reference" onClick={() => onOpenReferenceTask(task.id)} title={label} type="button">
        <span>{task.title}</span>
      </button>;
    },
    table: ({ children }) => <div className="discussion-markdown-table" role="region" aria-label={ui("Markdown 表格")} tabIndex={0}><table>{children}</table></div>,
  }} remarkPlugins={[remarkGfm, [discussionProsePlugin, mentions]]}>{text}</ReactMarkdown></div>;
}
