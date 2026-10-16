import type { CreationPlanningResult } from "@/ai/mock/lib/taskCreationPlanning";
import type { CreationContentSection } from "@/features/tasks/lib/task-creation-progress";
import type { CreationForm } from "@/features/tasks/lib/task-creation-form";
import { playMockAiSteps } from "@/ai/mock/lib/taskAiFeedback";

/** Explicit local demo transport. Its delays are not a live model's token stream. */
export async function streamMockCreationContent(result: CreationPlanningResult, options: {
  signal: AbortSignal;
  onStep: (index: number) => void;
  onContent: (section: CreationContentSection, form: CreationForm) => void;
  completedSections?: CreationContentSection[];
  stepMs?: number;
}): Promise<boolean> {
  const sections: CreationContentSection[] = result.stage === "review" ? ["identity", "criteria", "properties"] : [];
  for (let index = 0; index < Math.max(1, sections.length); index += 1) {
    if (sections[index] && options.completedSections?.includes(sections[index])) continue;
    if (options.signal.aborted) return false;
    options.onStep(index);
    const ready = await playMockAiSteps(1, { signal: options.signal, stepMs: options.stepMs ?? 900, onStep: () => {} });
    if (!ready || options.signal.aborted) return false;
    if (result.stage === "review") options.onContent(sections[index], result.form);
  }
  return !options.signal.aborted;
}
