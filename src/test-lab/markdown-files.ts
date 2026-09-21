import type { LabAttachment, LabEvidence } from './types';

export const isMarkdownName = (name: string) => /\.(md|markdown|mdown)$/i.test(name);
export function isMarkdownEvidence(item: LabEvidence) {
  return item.kind === '文件' && (item.attachment ? isMarkdownName(item.attachment.name) || /^text\/(?:x-)?markdown$/i.test(item.attachment.mimeType) : isMarkdownName(item.title));
}

export function markdownAttachment(name: string, content: string): LabAttachment {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { name, mimeType: 'text/markdown', size: bytes.length, dataUrl: `data:text/markdown;base64,${btoa(binary)}` };
}

export function updateEvidenceContent(item: LabEvidence, content: string): LabEvidence {
  return { ...item, content, ...(item.attachment && isMarkdownEvidence(item) ? { attachment: markdownAttachment(item.attachment.name, content) } : {}) };
}

export function evidenceDownload(item: LabEvidence) {
  if (isMarkdownEvidence(item)) return markdownAttachment(item.attachment?.name || item.title || '文档.md', item.content);
  return item.attachment ?? { name: item.title || '文件.txt', dataUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(item.content)}` };
}

export type SkillDocument = { path: string; content: string; start: number; end: number };
export function splitSkillDocuments(snapshot: string): SkillDocument[] {
  const markers = [...snapshot.matchAll(/^--- FILE: ([^\r\n]+) ---\r?\n/gm)];
  if (!markers.length) return [{ path: 'SKILL.md', content: snapshot, start: 0, end: snapshot.length }];
  return markers.map((marker, index) => {
    const start = marker.index! + marker[0].length;
    const end = markers[index + 1]?.index ?? snapshot.length;
    return { path: marker[1], content: snapshot.slice(start, end), start, end };
  });
}

export function replaceSkillDocument(snapshot: string, index: number, content: string) {
  const document = splitSkillDocuments(snapshot)[index];
  if (!document) throw new Error('文档不存在，请重新选择');
  const separator = document.end < snapshot.length && !content.endsWith('\n') ? '\n' : '';
  return snapshot.slice(0, document.start) + content + separator + snapshot.slice(document.end);
}
