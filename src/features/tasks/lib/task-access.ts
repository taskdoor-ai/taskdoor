type TaskMembership = { ownerId?: string; participantIds?: readonly string[] };

/** Team management, creation and parent membership never grant task content access. */
export function canReadWorkspaceTask(task: TaskMembership | undefined, actorId: string, activeTeamMember: boolean): boolean {
  return Boolean(task && actorId && activeTeamMember
    && (task.ownerId === actorId || task.participantIds?.includes(actorId)));
}
