import assert from "node:assert/strict";
import test from "node:test";
import { allTeamWorkspaceNodes } from "../src/ai/mock/data/teamWorkspaceScenarios.ts";
import { taskDetailMocks } from "../src/ai/mock/data/taskDetailMocks.ts";
import { notificationExamples } from "../src/ai/mock/data/notificationExamples.ts";
import { initialPersonalCenterState } from "../src/ai/mock/data/memberProfiles.ts";
import { mockWorkspaceUserId } from "../src/ai/mock/lib/mockWorkspaceAccount.ts";
import { activeMembership } from "../src/features/members/lib/team-membership-lifecycle.ts";
import { canReadWorkspaceTask } from "../src/features/tasks/lib/task-access.ts";
import { loadCollaboration, mergeCollaborationMessages } from "../src/features/tasks/lib/task-collaboration.ts";
import { resolveDiscussionNotificationAttachment } from "../src/features/tasks/lib/discussion-notification-source.ts";

const demoTask = allTeamWorkspaceNodes.find(task => task.kind === "task" && task.id === "fragrance-live");
assert.ok(demoTask?.kind === "task");
const detail = taskDetailMocks["fragrance-live"];
const team = initialPersonalCenterState.teams.find(team => team.id === demoTask.teamId)!;
const member = Boolean(activeMembership(team, mockWorkspaceUserId));

// These are the same persisted-task / detail-fixture inputs used by App.canReadTask before navigation.
test("默认账号的讨论附件通知能通过真实任务关系并解析到原消息引用", () => {
  const participants = demoTask.participantIds ?? detail.participants;
  assert.equal(canReadWorkspaceTask({ ownerId: demoTask.ownerId, participantIds: participants }, mockWorkspaceUserId, member), true,
    "内置通知必须指向默认账号确有参与关系的任务，不能借管理员或提及绕过任务权限");
  const notices = notificationExamples.filter(item => item.task?.id === demoTask.id && item.kind === "mention");
  assert.equal(notices.length, 2);
  for (const notice of notices) {
    assert.equal(notice.teamId, demoTask.teamId);
    assert.equal(notice.target?.area, "discussion");
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    const snapshot = loadCollaboration(storage, JSON.stringify([notice.teamId, demoTask.id]), detail.files);
    const messages = mergeCollaborationMessages(detail.activities, snapshot.messages);
    assert.ok(notice.attachments?.length);
    for (const attachment of notice.attachments!) {
      const source = resolveDiscussionNotificationAttachment(messages, snapshot.files, {
        messageId: notice.target!.activityId!, fileId: attachment.fileId, version: attachment.version,
      });
      assert.ok(source, `${notice.id} / ${attachment.name} 必须从与App一致的种子及协作快照解析`);
      assert.equal(source.message.id, notice.target!.activityId);
      assert.equal(source.file.id, attachment.fileId);
      assert.equal(source.ref.version, attachment.version);
    }
  }
});

test("显式移除任务参与关系或团队资格后，通知样例不能恢复访问", () => {
  assert.equal(canReadWorkspaceTask({ ownerId: demoTask.ownerId, participantIds: [] }, mockWorkspaceUserId, member), false);
  assert.equal(canReadWorkspaceTask({ ownerId: demoTask.ownerId, participantIds: detail.participants }, mockWorkspaceUserId, false), false);
  assert.equal(canReadWorkspaceTask({ ownerId: demoTask.ownerId, participantIds: detail.participants }, "其他成员", true), false);
});
