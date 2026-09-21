import { allTeamWorkspaceNodes } from "../data/teamWorkspaceScenarios";
import { progressDemoRevisions } from "../data/taskProgressDemoFixtures";
import { normalizeWorkspaceNodes, type TaskNode, type WorkspaceNode } from "../data/workspaceNodes";
import type { TaskActivityStore } from "./taskActivity";
import { getEffortScopeKey } from "./taskEffort";

const protectedFields = ["name", "parentId", "parentTaskId", "teamId", "ownerId", "participantIds", "goal", "completionCriteria", "criterionReviews", "executionTips", "effortEstimate", "effortBaseline", "createdAt", "createdBy", "createdFrom", "completedAt", "progressReopenedAt"] as const;

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
// Explanatory copy is not a scope input. Preserve it while matching the authored estimate's numeric/provenance fields.
const sameMockEstimate = (left: TaskNode["effortEstimate"], right: TaskNode["effortEstimate"]) =>
  left?.basis === "mock" && right?.basis === "mock"
  && (["basis", "confirmed", "minutes", "scopeKey", "version", "workMethod"] as const).every(key => same(left[key], right[key]));
const hasUserEdits = (activities: TaskActivityStore, id: string) => activities[id]?.some(activity =>
  !["member-post", "member-reply", "ai-insight"].includes(activity.type));
const scopeProtectedFields = ["goal", "completionCriteria", "criterionReviews", "executionTips", "parentTaskId", "teamId", "createdBy", "createdFrom"] as const;

/** Upgrade only an exact obsolete estimate and unchanged definition; unrelated edits stay intact. */
function repairLegacyMockScopes(nodes: WorkspaceNode[], seeds: Map<string, WorkspaceNode>) {
  let changed = false;
  const byId = new Map(nodes.map(node => [node.id, node]));
  const result = nodes.map(node => {
    if (node.kind !== "task") return node;
    const seed = seeds.get(node.id);
    if (seed?.kind !== "task" || seed.effortEstimate?.basis !== "mock" || !node.effortEstimate
      || node.effortEstimate.scopeKey === seed.effortEstimate.scopeKey) return node;
    if (!scopeProtectedFields.every(key => same(node[key], seed[key]))) return node;
    let ancestor: TaskNode = seed;
    const visited = new Set<string>();
    while (ancestor.parentTaskId && !visited.has(ancestor.id)) {
      visited.add(ancestor.id);
      const parent = seeds.get(ancestor.parentTaskId), storedParent = byId.get(ancestor.parentTaskId);
      if (parent?.kind !== "task" || storedParent?.kind !== "task"
        || !same(storedParent.goal, parent.goal) || storedParent.parentTaskId !== parent.parentTaskId) return node;
      ancestor = parent;
    }
    const legacyEstimate = { ...seed.effortEstimate, scopeKey: getEffortScopeKey({ ...seed, goal: ancestor.goal ?? "" }, seed.effortEstimate.workMethod) };
    if (!sameMockEstimate(node.effortEstimate, legacyEstimate)) return node;
    changed = true;
    return { ...node, effortEstimate: { ...node.effortEstimate, scopeKey: seed.effortEstimate.scopeKey } };
  });
  return changed ? result : nodes;
}

/** Restore absent legacy estimates only on exact, unedited built-in seeds; never append tasks. */
function restoreMissingMockEstimates(nodes: WorkspaceNode[], seeds: Map<string, WorkspaceNode>, activities: TaskActivityStore) {
  let changed = false;
  const fields = [...protectedFields.filter(key => key !== "effortEstimate"), "status", "plannedStartOn", "plannedEndOn", "dueAt"] as const;
  const result = nodes.map(node => {
    if (node.kind !== "task" || Object.hasOwn(node, "effortEstimate") || hasUserEdits(activities, node.id)) return node;
    const seed = seeds.get(node.id);
    if (seed?.kind !== "task" || seed.effortEstimate?.basis !== "mock") return node;
    const revision = progressDemoRevisions[node.id];
    const candidates = [seed, ...(revision ? [{ ...seed, ...revision.before, completedAt: undefined }] : [])];
    if (!candidates.some(candidate => fields.every(key => same(node[key], candidate[key])))) return node;
    changed = true;
    return { ...node, effortEstimate: { ...seed.effortEstimate } };
  });
  return changed ? result : nodes;
}

/** Missing creation metadata is a known old seed shape, not a user date to overwrite. */
function restoreMissingMockCreation(nodes: WorkspaceNode[], seeds: Map<string, WorkspaceNode>, activities: TaskActivityStore) {
  let changed = false;
  const fields = [...protectedFields.filter(key => key !== "createdAt"), "status", "plannedStartOn", "plannedEndOn", "dueAt", "dependsOnTaskIds"] as const;
  const result = nodes.map(node => {
    if (node.kind !== "task" || Object.hasOwn(node, "createdAt") || hasUserEdits(activities, node.id)) return node;
    const seed = seeds.get(node.id);
    if (seed?.kind !== "task" || !seed.createdAt) return node;
    const revision = progressDemoRevisions[node.id];
    const candidates = [seed, ...(revision ? [{...seed, ...revision.before, completedAt:undefined}] : [])];
    if (!candidates.some(candidate => fields.every(key => same(node[key], candidate[key])
      || key === "effortEstimate" && (sameMockEstimate(node.effortEstimate, candidate.effortEstimate)
        || !Object.hasOwn(node, "effortEstimate"))))) return node;
    changed = true;
    return {...node, createdAt:seed.createdAt};
  });
  return changed ? result : nodes;
}

/** Refresh exact historical seeds independently; edits to a sibling do not change this task's provenance. */
export function migrateProgressDemoFixtures(nodes: WorkspaceNode[], activities: TaskActivityStore = {}) {
  const seeds = new Map(normalizeWorkspaceNodes(allTeamWorkspaceNodes).map(node => [node.id, node]));
  nodes = repairLegacyMockScopes(nodes, seeds);
  nodes = restoreMissingMockCreation(nodes, seeds, activities);
  nodes = restoreMissingMockEstimates(nodes, seeds, activities);
  let changed = false;
  const result = nodes.map(task => {
    const revision = progressDemoRevisions[task.id], currentSeed = seeds.get(task.id);
    if (!revision || task.kind !== "task" || currentSeed?.kind !== "task" || hasUserEdits(activities, task.id)) return task;
    const originalSeed = { ...currentSeed, ...revision.before, completedAt: undefined };
    if (!Object.entries(revision.before).every(([key, value]) => task[key as keyof typeof task] === value)
      || !protectedFields.every(key => same(task[key], originalSeed[key])
        || key === "effortEstimate" && sameMockEstimate(task.effortEstimate, originalSeed.effortEstimate))) return task;
    changed = true;
    return { ...task, ...revision.after };
  });
  return changed ? result : nodes;
}
