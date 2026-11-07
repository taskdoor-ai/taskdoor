import { getMockTaskRequirementDefinition } from "@/ai/mock/lib/subtaskCreationDraft";
import { planTaskCreation } from "@/ai/mock/lib/taskCreationPlanning";
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
