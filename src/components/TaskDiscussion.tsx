import { ArrowUpRight, Link2, MessageSquare, Sparkles } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { TaskActivityMock, TaskFileNode } from "../data/taskDetailMocks";
import { getTaskDiscussionThreads } from "../lib/taskActivity";
import type { DiscussionAiTarget } from "../lib/taskDiscussionAi";
import { MentionComposer } from "./MentionComposer";
import { PersonAvatar, PersonName } from "./PersonAvatar";
import { TaskActivityFileLink } from "./TaskActivityFileLink";
import { Button } from "./ui/button";

type TaskDiscussionProps = {
  activities: TaskActivityMock[];
  attentionTarget?: { id: string; sequence: number };
  currentUser: string;
  files: TaskFileNode[];
  onConnectAi?: (target: DiscussionAiTarget, trigger: HTMLElement) => void;
  onOpenFile: (fileId: string) => void;
  onPost: (message: string, replyToActivityId?: string) => void;
  people: string[];
};

function parseDiscussionMessage(detail: string) {
  const quoteMatch = detail.match(/\n\n引用「([^」]+)」：([\s\S]+)$/);
  return {
    message: quoteMatch ? detail.slice(0, quoteMatch.index) : detail,
    quote: quoteMatch?.[2],
    source: quoteMatch?.[1],
  };
}

function DiscussionTime({ activity }: { activity: TaskActivityMock }) {
  const hasTimestamp = Number.isFinite(Date.parse(activity.createdAt ?? ""));
  return <time dateTime={hasTimestamp ? activity.createdAt : undefined} title={hasTimestamp ? undefined : "历史记录未保存精确发生时间"}>{!hasTimestamp && "原时间："}{activity.time}</time>;
}

function DiscussionBody({ activity, files, onOpenFile }: {
  activity: TaskActivityMock;
  files: TaskFileNode[];
  onOpenFile: (fileId: string) => void;
}) {
  const detail = parseDiscussionMessage(activity.message);
  const file = files.find((node) => node.kind === "file" && !node.archived && node.name === (detail.source ?? activity.file));
  return <>
    <p className="task-discussion-message">{detail.message}</p>
    {detail.quote && <blockquote className="task-discussion-quote">
      <p>{detail.quote}</p>
      <button disabled={!file} onClick={() => { if (file) onOpenFile(file.id); }} type="button">
        <Link2 aria-hidden="true" size={13} /><span>{detail.source}</span>
        <small>{file ? "查看原文" : "原文暂不可用"}</small>{file && <ArrowUpRight aria-hidden="true" size={13} />}
      </button>
    </blockquote>}
    {activity.file && !detail.quote && <TaskActivityFileLink fileId={file?.id} fileName={activity.file} onOpen={onOpenFile} />}
  </>;
}

export function TaskDiscussion({ activities, attentionTarget, currentUser, files, onConnectAi, onOpenFile, onPost, people }: TaskDiscussionProps) {
  const threads = getTaskDiscussionThreads(activities);
  const [replyingToActivityId, setReplyingToActivityId] = useState<string | null>(null);
  const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);
  const collaborators = people.filter((person) => person !== currentUser);

  useEffect(() => {
    if (!attentionTarget) {
      setHighlightedActivityId(null);
      return;
    }
    setHighlightedActivityId(attentionTarget.id);
    const timer = window.setTimeout(() => setHighlightedActivityId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [attentionTarget?.id, attentionTarget?.sequence]);

  return <div className="task-discussion">
    <div className="task-discussion-compose">
      <PersonAvatar name={currentUser} personId={currentUser} size="sm" />
      <MentionComposer actionLabel="发送讨论" onSubmit={(message) => onPost(message)} people={collaborators} placeholder="说说进展、提出问题，或 @ 协作者…" />
    </div>
    {threads.length === 0 ? <div className="task-record-empty">
      <MessageSquare aria-hidden="true" size={22} />
      <strong>还没有讨论</strong><p>发起第一条讨论，与协作者对齐下一步。</p>
    </div> : <ol aria-label="任务讨论" className="task-discussion-threads">{threads.map(({ activity, replies, context }) => <li
      className="task-discussion-thread"
      key={activity.id}
    >
      <PersonAvatar name={activity.author} personId={activity.author} size="sm" />
      <div className="task-discussion-thread-body">
        <div className={`task-discussion-record${highlightedActivityId === activity.id ? " is-attention" : ""}`} id={`task-activity-${activity.id}`} tabIndex={-1}>
          <header className="task-discussion-thread-header">
            <div className="task-discussion-meta"><strong><PersonName name={activity.author} personId={activity.author} /></strong><DiscussionTime activity={activity} /></div>
            {onConnectAi && <Button aria-label={`连接 AI：${activity.author}的讨论`} className="task-discussion-ai-trigger" onClick={(event) => onConnectAi({ kind: "discussion", activityId: activity.id }, event.currentTarget)} size="icon-sm" title="连接 AI" type="button" variant="ai"><Sparkles aria-hidden="true" size={15} /></Button>}
          </header>
          {context && <blockquote className="task-discussion-context"><small>回复原{context.type === "ai-insight" ? " AI 建议" : "活动记录"} · {context.author}</small><DiscussionBody activity={context} files={files} onOpenFile={onOpenFile} /></blockquote>}
          {!context && activity.replyToActivityId && <p className="task-discussion-context-unavailable">回复的原记录暂不可用</p>}
          <DiscussionBody activity={activity} files={files} onOpenFile={onOpenFile} />
          <div className="task-discussion-actions">
            <button aria-expanded={replyingToActivityId === activity.id} onClick={() => setReplyingToActivityId(replyingToActivityId === activity.id ? null : activity.id)} type="button"><MessageSquare aria-hidden="true" size={14} />回复</button>
            {replies.length > 0 && <span>{replies.length} 条回复</span>}
          </div>
        </div>
        {replies.length > 0 && <ol aria-label={`回复 ${activity.author} 的讨论`} className="task-discussion-replies">{replies.map((reply) => <li key={reply.id}>
          <PersonAvatar name={reply.author} personId={reply.author} size="xs" />
          <div className={`task-discussion-record${highlightedActivityId === reply.id ? " is-attention" : ""}`} id={`task-activity-${reply.id}`} tabIndex={-1}>
            <header><strong><PersonName name={reply.author} personId={reply.author} /></strong><DiscussionTime activity={reply} /></header>
            <DiscussionBody activity={reply} files={files} onOpenFile={onOpenFile} />
          </div>
        </li>)}</ol>}
        {replyingToActivityId === activity.id && <div className="task-discussion-reply-compose"><MentionComposer actionLabel="发送回复" autoFocus compact key={activity.id} onCancel={() => setReplyingToActivityId(null)} onConnectAi={onConnectAi ? (draft, trigger) => onConnectAi({ kind: "reply-draft", activityId: activity.id, draft }, trigger) : undefined} onSubmit={(message) => { onPost(message, activity.id); setReplyingToActivityId(null); }} people={collaborators} placeholder={`回复 ${activity.author}…`} /></div>}
      </div>
    </li>)}</ol>}
  </div>;
}
