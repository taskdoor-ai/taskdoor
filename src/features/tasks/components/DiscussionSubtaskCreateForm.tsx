import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";
import { generateDiscussionSubtaskDraft, isDiscussionSubtaskRequestCurrent, type DiscussionSubtaskRequest, type DiscussionSubtaskResult } from "@/features/tasks/lib/discussion-subtask-draft";
import { useEffect, useState, useRef, type ComponentProps } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { TaskSubtaskCreateForm } from "@/features/tasks/components/TaskSubtaskCreateForm";
import { defaultGeneratedOwnerId } from "@/features/tasks/lib/generated-task-owner";
import "@/features/tasks/styles/task-subtask-editing.css";

type FormProps = ComponentProps<typeof TaskSubtaskCreateForm>;
type Props = Omit<FormProps, "open" | "initialDraft" | "generating" | "showTags"> & {
  source: NonNullable<NonNullable<FormProps["initialDraft"]>["sourceDiscussion"]>;
  contextCurrent: boolean;
  request?: DiscussionSubtaskRequest;
  messages?: readonly CollaborationMessage[];
};

export function DiscussionSubtaskCreateForm({ source, contextCurrent: sourceCurrent, request: incomingRequest, messages, ...formProps }: Props) {
  const { locale } = useI18n();
  const [request] = useState(() => incomingRequest);
  const contextCurrent = sourceCurrent && (!request || !messages || isDiscussionSubtaskRequestCurrent(request, messages))
    && JSON.stringify(request?.referencedTasks ?? []) === JSON.stringify(incomingRequest?.referencedTasks ?? []);
  const [result, setResult] = useState<DiscussionSubtaskResult | null>(null);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(Boolean(request && contextCurrent));
  const edited = useRef(false);
  const requestKey = JSON.stringify(request);
  useEffect(() => {
    if (!request || !contextCurrent || edited.current) { setGenerating(false); return; }
    const controller = new AbortController();
    setError("");
    setGenerating(true);
    void generateDiscussionSubtaskDraft(request, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      if (!edited.current) setResult(value);
      setGenerating(false);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setError(locale === "en" ? "Could not prepare a draft." : "暂时未能生成草稿。");
      setGenerating(false);
    });
    return () => controller.abort();
  }, [requestKey, contextCurrent, locale]);
  const latestContextCurrent = useRef(contextCurrent);
  latestContextCurrent.current = contextCurrent;
  const outdated = locale === "en"
    ? "The source discussion changed. Cancel and start again from the latest message."
    : "来源讨论已更新，请取消后从最新讨论重新创建。";

  const keepManualInput = () => { edited.current = true; setGenerating(false); };
  return <div onInputCapture={keepManualInput} onPointerDownCapture={keepManualInput} onKeyDownCapture={keepManualInput}>
    {error && <p className="task-subtask-create-error" role="status">{locale === "en" ? "Could not prepare a draft. You can fill in the form below." : "暂时未能生成草稿，可直接填写下方表单。"}</p>}
    {!contextCurrent && <p className="task-subtask-create-error" role="alert">{outdated}</p>}
    <TaskSubtaskCreateForm {...formProps} generating={generating && contextCurrent && !edited.current} showTags={false} key={result?.draft ? "generated" : "blank"} initialDraft={{ ...(result?.draft ? { ...result.draft, ownerId: defaultGeneratedOwnerId(result.draft.ownerId, formProps.currentUserId ?? "", formProps.members.map(member => member.id)) } : {}), sourceDiscussion: source }} onCreate={value => {
      if (!latestContextCurrent.current) throw new Error(outdated);
      return formProps.onCreate(value);
    }} open />
  </div>;
}
