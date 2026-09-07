import { creatorCommerceMainTaskId } from "../data/workspaceNodes.ts";

const representativeTaskIds = {
  compliance: "fragrance-compliance",
  creatorBusiness: "fragrance-creator-business",
  live: "fragrance-live",
} as const;

export function getCreationPreviewTaskId({ title, subtaskCount }: { title: string; subtaskCount: number }) {
  if (/合规|合同|宣称/.test(title)) return representativeTaskIds.compliance;
  if (/达人|建联|商务/.test(title) && subtaskCount <= 2) return representativeTaskIds.creatorBusiness;
  if (/直播|投流|复盘/.test(title) && subtaskCount <= 3) return representativeTaskIds.live;
  return creatorCommerceMainTaskId;
}
