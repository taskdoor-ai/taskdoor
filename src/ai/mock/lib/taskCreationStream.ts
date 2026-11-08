import type { CreationPlanningResult } from "@/ai/mock/lib/taskCreationPlanning";
import { creationCriterionPartKey, type CreationContentSection } from "@/features/tasks/lib/task-creation-progress";
import type { CreationForm } from "@/features/tasks/lib/task-creation-form";
import { playMockAiSteps } from "@/ai/mock/lib/taskAiFeedback";
import { revealMockTextParts } from "@/ai/mock/lib/mockTextReveal";

/**
 * Explicit local demo transport. Title, goal and each criterion are revealed character by
 * character in plan order; this simulates, and is not, a live model's token stream.
 */
export async function streamMockCreationContent(result: CreationPlanningResult, options: {
  signal: AbortSignal;
  onStep: (index: number) => void;
  onContent: (section: CreationContentSection, form: CreationForm) => void;
  completedSections?: CreationContentSection[];
  isPartCompleted?: (key: string) => boolean;
  stepMs?: number;
  charMs?: number;
}): Promise<boolean> {
  const sections: CreationContentSection[] = result.stage === "review" ? ["identity", "criteria", "properties"] : [];
  for (let index = 0; index < Math.max(1, sections.length); index += 1) {
    const section = sections[index];
    if (section && options.completedSections?.includes(section)) continue;
    if (options.signal.aborted) return false;
    options.onStep(index);
    if (result.stage === "review" && (section === "identity" || section === "criteria")) {
      const task = result.form.mainTask;
      const partial = (patch: Partial<CreationForm["mainTask"]>): CreationForm => ({ ...result.form, mainTask: { ...task, ...patch } });
      if (section === "identity") {
        const shown = { title: "", goal: "" };
        const ready = await revealMockTextParts([{ key: "title", text: task.title }, { key: "goal", text: task.goal }], {
          signal: options.signal, isCompleted: options.isPartCompleted, charMs: options.charMs,
          onReveal: (key, text) => { shown[key as "title" | "goal"] = text; options.onContent(section, partial({ ...shown })); },
        });
        if (!ready) return false;
      } else {
        const shown: string[] = [];
        const ready = await revealMockTextParts(task.completionCriteria.map((text, criterion) => ({ key: creationCriterionPartKey(criterion), text })), {
          signal: options.signal, isCompleted: options.isPartCompleted, charMs: options.charMs,
          onReveal: (key, text) => { shown[Number(key.slice("criterion:".length))] = text; options.onContent(section, partial({ completionCriteria: [...shown] })); },
        });
        if (!ready) return false;
        if (task.completionCriteria.length === 0) options.onContent(section, result.form);
      }
      continue;
    }
    const ready = await playMockAiSteps(1, { signal: options.signal, stepMs: options.stepMs ?? 900, onStep: () => {} });
    if (!ready || options.signal.aborted) return false;
    if (result.stage === "review") options.onContent(section, result.form);
  }
  return !options.signal.aborted;
}
