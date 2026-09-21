import { allTeamWorkspaceNodes } from "../data/teamWorkspaceScenarios";
import type { WorkspaceNode } from "../data/workspaceNodes";

const fixtureTeams = new Map(allTeamWorkspaceNodes
  .filter(node => node.kind === "task")
  .map(node => [node.id, node.teamId]));

/** Waiting for review is still in progress. Only correct saved built-in demo states. */
export function migrateTaskStatusDemoFixtures(nodes: WorkspaceNode[]): WorkspaceNode[] {
  let changed = false;
  const result = nodes.map(node => {
    if (node.kind !== "task" || node.status !== "待审核" || !fixtureTeams.has(node.id)
      || (node.teamId ?? "creator-commerce") !== fixtureTeams.get(node.id)) return node;
    changed = true;
    return { ...node, status: "进行中" as const };
  });
  return changed ? result : nodes;
}
