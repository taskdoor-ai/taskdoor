import type { TaskNode, WorkspaceNode } from "@/shared/model/task-model";
import { appendTaskActivity, createTaskChangeActivity, parseTaskActivityStore } from "@/features/tasks/lib/task-activity";
import { commitTaskAiStorage, recoverTaskAiStorage } from "@/features/tasks/lib/task-ai-adjustment-storage";
import { saveCollaboration, type CollaborationMessage, type CollaborationPerson, type CollaborationSnapshot } from "@/features/tasks/lib/task-collaboration";

type ParticipantSnapshot = { id: string; participants: string[] };
type PublicationInput<T extends ParticipantSnapshot> = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  scopeKey: string;
  teamId: string;
  taskId: string;
  actorId: string;
  actorName: string;
  members: readonly CollaborationPerson[];
  nodes: WorkspaceNode[];
  seeds: TaskNode[];
  seedParticipants: readonly string[];
  legacySnapshots: Record<string, T>;
  latestLegacySnapshot: T | null;
  current: CollaborationSnapshot;
  next: CollaborationSnapshot;
  message: CollaborationMessage;
};

/** The caller supplies the current active team directory; no task grant is required of mention recipients. */
export function publishTaskDiscussion<T extends ParticipantSnapshot>(input: PublicationInput<T>) {
  const { storage, nodes, taskId, teamId, actorId, message, current, next } = input;
  recoverTaskAiStorage(storage);
  if (input.scopeKey !== JSON.stringify([teamId, taskId])) throw new Error("讨论所属团队或任务已变化，请重新打开任务。");
  const storedNodes = storage.getItem("agentdoor-workspace-nodes");
  if (storedNodes && JSON.stringify(JSON.parse(storedNodes)) !== JSON.stringify(nodes)) throw new Error("任务已在其他页面更新，请核对最新清单后重试。");
  const task = nodes.find((node): node is TaskNode => node.kind === "task" && node.id === taskId && node.teamId === teamId);
  if (!task) throw new Error("当前任务已不存在，请返回任务列表。");
  const byId = new Map(input.members.map(member => [member.id, member]));
  const previous = [...new Set(input.legacySnapshots[taskId]?.participants ?? task.participantIds ?? input.seedParticipants)].filter(id => id !== task.ownerId);
  if (!byId.has(actorId) || (task.ownerId !== actorId && !previous.includes(actorId)) || message.author !== actorId) throw new Error("你已没有当前任务的讨论发布资格，输入已保留。");
  const mentioned = [...new Set(message.mentionedPrincipalIds ?? [])];
  if (mentioned.some(id => !byId.has(id))) throw new Error("被提及者已不属于当前团队的有效成员，请重新选择。输入已保留。");
  const activities = parseTaskActivityStore(JSON.parse(storage.getItem("agentdoor-task-activity") ?? "{}"));
  const participantInvitations: Record<string, Record<string, "accepted" | "pending">> = JSON.parse(storage.getItem("agentdoor-task-participant-invitations") ?? "{}");
  if (!participantInvitations || typeof participantInvitations !== "object" || Array.isArray(participantInvitations)) throw new Error("任务人员记录损坏，请先恢复记录。");
  if (current.messages.some(item => item.id === message.id) && next === current) return { snapshot: current, nodes, activities, seeds: input.seeds, legacySnapshots: input.legacySnapshots, latestLegacySnapshot: input.latestLegacySnapshot, participantInvitations };
  if (!next.messages.some(item => item.id === message.id && item.author === actorId)) throw new Error("待发布消息不存在，输入已保留。");
  const added = mentioned.filter(id => id !== task.ownerId && !previous.includes(id));
  const participants = [...previous, ...added];
  const nextNodes = added.length ? nodes.map(node => node.id === taskId ? { ...task, participantIds: participants, updatedAt: message.createdAt ?? new Date().toISOString() } : node) : nodes;
  const activity = createTaskChangeActivity({ author: input.actorName, type: "participants-change", message: "通过 @ 加入任务参与者", changes: added.map(id => ({ label: "新增参与人", before: null, after: byId.get(id)!.name })) }, { id: `mention-participants:${message.id}`, now: new Date(message.createdAt ?? Date.now()) });
  const nextActivities = activity ? appendTaskActivity(activities, taskId, activity) : activities;
  const seeds = activity && !input.seeds.some(node => node.id === taskId) ? [...input.seeds, { ...task }] : input.seeds;
  const legacySnapshots = added.length && input.legacySnapshots[taskId] ? { ...input.legacySnapshots, [taskId]: { ...input.legacySnapshots[taskId], participants } } : input.legacySnapshots;
  const latestLegacySnapshot = added.length && input.latestLegacySnapshot?.id === taskId ? { ...input.latestLegacySnapshot, participants } : input.latestLegacySnapshot;
  const nextInvitations = added.length ? { ...participantInvitations, [taskId]: Object.fromEntries(participants.map(id => [id, "accepted" as const])) } : participantInvitations;
  const snapshot = saveCollaboration(storage, input.scopeKey, current.revision, next, (key, serialized) => {
    const writes: Array<[string, string]> = [[key, serialized]];
    if (added.length) {
      writes.push(
        ["agentdoor-workspace-nodes", JSON.stringify(nextNodes)],
        ["agentdoor-task-activity", JSON.stringify(nextActivities)],
        ["agentdoor-task-detail-seeds", JSON.stringify(seeds)],
        ["agentdoor-task-participant-invitations", JSON.stringify(nextInvitations)],
      );
      if (legacySnapshots !== input.legacySnapshots) writes.push(["agentdoor-created-tasks", JSON.stringify(legacySnapshots)]);
      if (latestLegacySnapshot !== input.latestLegacySnapshot) writes.push(["agentdoor-created-task", JSON.stringify(latestLegacySnapshot)]);
    }
    commitTaskAiStorage(storage, writes);
  });
  return { snapshot, nodes: nextNodes, activities: nextActivities, seeds, legacySnapshots, latestLegacySnapshot, participantInvitations: nextInvitations };
}
