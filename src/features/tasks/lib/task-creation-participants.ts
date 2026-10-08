/** Default participation is based on the directly assigned owner. */
export function defaultCreationParticipantIds(
  task: { ownerId: string; participantIds?: string[] },
  creatorId: string,
): string[] {
  const participants = task.participantIds ?? [];
  if (!creatorId) return [...participants];
  return [...new Set([...participants, creatorId])].filter(id => id !== task.ownerId);
}
