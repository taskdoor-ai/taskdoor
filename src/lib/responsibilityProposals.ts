import type { ResponsibilityClaim, ResponsibilityDocument } from "../data/memberProfiles";

export const splitResponsibilityContent = (value: string) => value
  .split(/\n\s*\n/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean);

export const serializeResponsibilityContent = (paragraphs: string[]) => paragraphs
  .map((paragraph) => paragraph.trim())
  .filter(Boolean)
  .join("\n\n");

export type ResponsibilityProposalResult =
  | { status: "applied"; content: string; resultIndex: number; previousText?: string }
  | { status: "duplicate"; content: string; resultIndex: number; previousText?: string }
  | { status: "conflict" | "invalid"; content: string; message: string };

export function rebaseResponsibilityUpdateProposal(document: ResponsibilityDocument, claim: ResponsibilityClaim): ResponsibilityClaim {
  const proposal = claim.proposal;
  if (proposal?.operation !== "update" || proposal.baseRevisionId === document.revisionId) return claim;
  const paragraphs = splitResponsibilityContent(document.content);
  if (paragraphs[proposal.target.paragraphIndex] !== proposal.target.expectedText) return claim;
  return { ...claim, proposal: { ...proposal, baseRevisionId: document.revisionId } };
}

export function applyResponsibilityProposal(document: ResponsibilityDocument, claim: ResponsibilityClaim, draftValue: string): ResponsibilityProposalResult {
  const appliedText = draftValue.trim();
  if (!appliedText) return { status: "invalid", content: document.content, message: "责任内容不能为空" };
  if (/[\r\n]/.test(appliedText)) return { status: "invalid", content: document.content, message: "一条责任不能包含换行，请整理成一条后再提交" };

  const paragraphs = splitResponsibilityContent(document.content);
  const proposal = claim.proposal;
  if (!proposal) return { status: "invalid", content: document.content, message: "待确认责任缺少操作类型，请忽略并等待重新生成" };
  if (proposal.operation === "add") {
    const existingIndex = paragraphs.indexOf(appliedText);
    if (existingIndex >= 0) return { status: "duplicate", content: document.content, resultIndex: existingIndex };
    return {
      status: "applied",
      content: serializeResponsibilityContent([...paragraphs, appliedText]),
      resultIndex: paragraphs.length,
    };
  }

  if (document.revisionId !== proposal.baseRevisionId) {
    return { status: "conflict", content: document.content, message: "责任内容已变化，请重新核对后再更新" };
  }
  const { expectedText, paragraphIndex } = proposal.target;
  if (paragraphs[paragraphIndex] !== expectedText) {
    return { status: "conflict", content: document.content, message: "原责任已变化，无法安全更新" };
  }
  if (appliedText === expectedText) {
    return { status: "duplicate", content: document.content, previousText: expectedText, resultIndex: paragraphIndex };
  }
  const nextParagraphs = paragraphs.map((paragraph, index) => index === paragraphIndex ? appliedText : paragraph);
  return {
    status: "applied",
    content: serializeResponsibilityContent(nextParagraphs),
    previousText: expectedText,
    resultIndex: paragraphIndex,
  };
}
