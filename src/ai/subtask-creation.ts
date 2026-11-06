import { parseDiscussionSubtaskDraft, type DiscussionSubtaskRequest, type DiscussionSubtaskResult } from "@/features/tasks/lib/discussion-subtask-draft";
import { buildSubtaskDraftRequest, parseSubtaskDraftResult, type SubtaskCreationInput } from "@/features/tasks/lib/task-subtask-draft";
import type { NewSubtaskDraft } from "@/features/tasks/lib/workspace-subtask-editing";

export type { SubtaskCreationInput } from "@/features/tasks/lib/task-subtask-draft";

export async function generateSubtaskFromPrompt(input: SubtaskCreationInput, signal: AbortSignal): Promise<NewSubtaskDraft> {
  signal.throwIfAborted();
  const request = buildSubtaskDraftRequest(input);
  const fallback = request.locale === "en" ? "Could not prepare the subtask. Your input has been kept. Try again." : "暂时未能生成子任务，需求已保留，请重试。";
  return parseSubtaskDraftResult(await requestSubtaskDraft(request, signal, fallback), request);
}

export async function generateDiscussionSubtaskDraft(request: DiscussionSubtaskRequest, signal: AbortSignal): Promise<DiscussionSubtaskResult> {
  const fallback = request.locale === "en" ? "Could not prepare a draft. Try again or enter the details yourself." : "暂时未能整理草稿，可重试或手动填写。";
  const result = await requestSubtaskDraft(request, signal, fallback);
  try { return parseDiscussionSubtaskDraft(result, request); } catch { throw new Error(fallback); }
}

async function requestSubtaskDraft(request: object, signal: AbortSignal, fallback: string): Promise<unknown> {
  signal.throwIfAborted();
  try {
    const response = await fetch("/api/subtask-draft", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-TaskDoor-Subtask-Draft": "1" },
      body: JSON.stringify(request), signal,
    });
    if (!response.ok) throw new Error(fallback);
    const result: unknown = await response.json();
    signal.throwIfAborted();
    return result;
  } catch {
    signal.throwIfAborted();
    throw new Error(fallback);
  }
}
