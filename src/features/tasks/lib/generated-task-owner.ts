/**
 * AI-generated tasks never stay unowned by accident: when generation leaves the owner empty or
 * names someone outside the team, the creator owns the task. An owner the AI chose is kept.
 * A member cannot delete an unowned task, so this keeps creators able to manage what they made.
 * People can still pick "Unassigned" by hand afterwards where the owner is editable.
 */
export function defaultGeneratedOwnerId(ownerId: string | undefined, creatorId: string, teamMemberIds: Iterable<string>): string {
  const team = new Set(teamMemberIds);
  if (ownerId && team.has(ownerId)) return ownerId;
  return creatorId && team.has(creatorId) ? creatorId : "";
}
