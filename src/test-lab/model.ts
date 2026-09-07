import { skillIds, type LabCase, type LabStep, type LabTask, type LabTeam } from "./types";

export const uid = () => crypto.randomUUID();
export const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);
const industryLabels: Record<string, string> = {
  legal_services: "法律服务",
  short_video_media: "自媒体短视频",
  saas_delivery: "SaaS 交付",
  ecommerce_operations: "电商运营",
  manufacturing_npi: "制造业新品导入",
  retail_chain_operations: "连锁零售运营",
  renovation_handover: "装修交付",
  software_release: "软件发布",
  customer_support_incident: "客户支持与事故响应",
  hiring_onboarding: "招聘与入职",
};
export const displayIndustry = (industry: string) => industryLabels[industry] || industry || "未设行业";
export const newTask = (createdById: string | null = null): LabTask => ({ id: uid(), title: "新任务", goal: "", status: "待开始", createdById, ownerId: null, participantIds: [], parentId: null, dependsOnTaskIds: [], acceptanceCriteria: [], executionTips: [], estimatedMinutes: null, dueAt: null, tags: [], visibility: "team", version: 1 });
export const newTeam = (): LabTeam => ({ id: uid(), name: "新团队", industry: "", description: "", archived: false, members: [], tasks: [], evidence: [] });
export const newStep = (): LabStep => ({ id: uid(), prompt: "", skillId: skillIds[0], taskId: null, usePreviousOutput: false, events: [] });
export const newCase = (team?: LabTeam): LabCase => ({ id: uid(), name: "新用例", category: "自定义", teamId: team?.id || "", actorId: team?.members[0]?.id || "", description: "", archived: false, enabled: true, version: 1, steps: [newStep()], assertions: [], reviewChecklist: [] });
export function copyTeam(source: LabTeam): LabTeam {
  const copied = structuredClone(source);
  const ids = new Map([source.id, ...source.members.map((item) => item.id), ...source.tasks.map((item) => item.id), ...source.evidence.map((item) => item.id)].map((id) => [id, uid()]));
  const mapped = (id: string) => ids.get(id) || id;
  return { ...copied, id: mapped(source.id), name: `${source.name} · 副本`, archived: false,
    members: copied.members.map((member) => ({ ...member, id: mapped(member.id), version: 1 })),
    tasks: copied.tasks.map((task) => ({ ...task, id: mapped(task.id), createdById: task.createdById ? mapped(task.createdById) : null, ownerId: task.ownerId ? mapped(task.ownerId) : null, participantIds: task.participantIds.map(mapped), parentId: task.parentId ? mapped(task.parentId) : null, dependsOnTaskIds: task.dependsOnTaskIds.map(mapped), version: 1 })),
    evidence: copied.evidence.map((item) => ({ ...item, id: mapped(item.id), taskId: mapped(item.taskId), authorId: mapped(item.authorId), visibleToIds: item.visibleToIds.map(mapped), version: 1 })),
  };
}
export function copyCase(source: LabCase): LabCase {
  const copied = structuredClone(source);
  const stepIds = new Map(copied.steps.map((step) => [step.id, uid()]));
  return { ...copied, id: uid(), name: `${copied.name} · 副本`, archived: false, version: 1,
    steps: copied.steps.map((step) => ({ ...step, id: stepIds.get(step.id)! })),
    assertions: copied.assertions.map((assertion) => ({ ...assertion, id: uid(), stepId: stepIds.get(assertion.stepId) || assertion.stepId })),
  };
}
export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const runLabels = { queued: "排队中", running: "运行中", passed: "通过", failed: "失败", needs_review: "待人工核对", cancelled: "已取消", interrupted: "已中断" };
export const isActiveRun = (status: string) => status === "queued" || status === "running";
