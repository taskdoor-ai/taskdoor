import { getMockTaskRequirementDefinition } from "@/ai/mock/lib/subtaskCreationDraft";
import { planTaskCreation } from "@/ai/mock/lib/taskCreationPlanning";
import { revealMockTextParts } from "@/ai/mock/lib/mockTextReveal";
import type { ScenarioContext } from "@/ai/mock/lib/taskCreationScenario";
import type { QuickTaskContent } from "@/features/tasks/lib/workspace-task-creation";
import type { Locale } from "@/shared/i18n/core";

export function generateQuickTaskContent(prompt: string, context: ScenarioContext, locale: Locale, signal: AbortSignal): QuickTaskContent & { title: string } {
  signal.throwIfAborted();
  const result = planTaskCreation(prompt, context, { locale });
  if (result.stage === "clarify") throw new Error(result.questions.map(question => question.title).join(" "));
  if (result.stage === "decision") throw new Error(locale === "en" ? "Review the existing task relationship in the task creation conversation." : "发现已有任务关系需要确认，请在对话创建中核对。");
  const { title, goal, completionCriteria } = result.stage === "review" ? result.form.mainTask
    : getMockTaskRequirementDefinition({ prompt, locale });
  return { title, goal, completionCriteria };
}

export type QuickTaskPreview = { title: string; goal: string; completionCriteria: string[] };

/**
 * Local demo only: reveal the generated title, goal and each criterion character by character
 * inside the detail skeleton. A live model would stream these parts itself.
 */
export async function revealQuickTaskContent(content: QuickTaskPreview, options: {
  signal: AbortSignal;
  onUpdate: (preview: QuickTaskPreview) => void;
  isPartCompleted?: (key: string) => boolean;
}): Promise<void> {
  const shown: QuickTaskPreview = { title: "", goal: "", completionCriteria: [] };
  const parts = [
    { key: "title", text: content.title },
    { key: "goal", text: content.goal },
    ...content.completionCriteria.map((text, index) => ({ key: `criterion:${index}`, text })),
  ];
  const ready = await revealMockTextParts(parts, {
    signal: options.signal,
    isCompleted: options.isPartCompleted,
    onReveal: (key, text) => {
      if (key === "title" || key === "goal") shown[key] = text;
      else shown.completionCriteria[Number(key.slice("criterion:".length))] = text;
      options.onUpdate({ ...shown, completionCriteria: [...shown.completionCriteria] });
    },
  });
  if (!ready) throw new DOMException("Aborted", "AbortError");
}
