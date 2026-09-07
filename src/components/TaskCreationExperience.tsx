import type { ComponentProps } from "react";
import { TaskCreationPage } from "./TaskCreationPage";

type TaskCreationExperienceProps = ComponentProps<typeof TaskCreationPage>;

export function TaskCreationExperience(props: TaskCreationExperienceProps) {
  return <section className="task-creation-experience">
    <TaskCreationPage {...props} />
  </section>;
}
