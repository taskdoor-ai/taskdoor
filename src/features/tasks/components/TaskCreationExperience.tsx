import type { ComponentProps } from "react";
import { TaskCreationPage } from "@/features/tasks/components/TaskCreationPage";

type TaskCreationExperienceProps = ComponentProps<typeof TaskCreationPage>;

export function TaskCreationExperience(props: TaskCreationExperienceProps) {
  return <section className="task-creation-experience">
    <TaskCreationPage key={`${props.currentUserId}:${props.teamId ?? "default"}`} {...props} />
  </section>;
}
