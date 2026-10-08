import { ChevronRight } from "lucide-react";
import type { ScenarioChoice } from "../lib/taskCreationScenario";

type TaskCreationChoiceCardsProps = {
  choices: ScenarioChoice[];
  disabled?: boolean;
  onSelect: (choice: ScenarioChoice) => void;
  variant?: "answers" | "actions";
};

export function TaskCreationChoiceCards({ choices, disabled = false, onSelect, variant = "answers" }: TaskCreationChoiceCardsProps) {
  return <div aria-label={variant === "actions" ? "选择后续操作" : "选择一个回答"} className="task-creation-choice-cards" data-variant={variant} role="group">
    {choices.map((choice, index) => <button aria-label={choice.description ? `${choice.title}：${choice.description}` : choice.title} className="task-creation-choice-card" data-emphasis={variant === "actions" && index === 0 ? "primary" : "secondary"} disabled={disabled} key={choice.id} onClick={() => onSelect(choice)} type="button">
      <span className="task-creation-choice-copy">
        <strong>{choice.title}</strong>
        {variant === "answers" && choice.description && <span>{choice.description}</span>}
      </span>
      <ChevronRight aria-hidden="true" />
    </button>)}
  </div>;
}
