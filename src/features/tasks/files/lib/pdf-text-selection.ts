type PageRect = { left: number; top: number; width: number; height: number };
export type PdfSelectionRegion = { x: number; y: number; width: number; height: number };
type PdfTextRange = { text: string; documentText: string; selectionStart: number; selectionEnd: number };
export type PdfTextSelection = PdfTextRange & {
  pageIndex: number;
  region: PdfSelectionRegion;
  rect: { left: number; bottom: number };
};

function isUtf16Boundary(text: string, offset: number): boolean {
  const before = text.charCodeAt(offset - 1);
  const after = text.charCodeAt(offset);
  return !(before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff);
}

export function normalizePdfTextRange(documentText: string, start: number, end: number): PdfTextRange | null {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > documentText.length
    || !isUtf16Boundary(documentText, start) || !isUtf16Boundary(documentText, end)) return null;
  const raw = documentText.slice(start, end);
  const text = raw.trim();
  if (!text) return null;
  const selectionStart = start + raw.length - raw.trimStart().length;
  return { text, documentText, selectionStart, selectionEnd: selectionStart + text.length };
}

function validRect(rect: PageRect): boolean {
  return [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
}

export function normalizePdfSelectionRects(rects: Iterable<PageRect>, pageRect: PageRect): PdfSelectionRegion[] {
  if (!validRect(pageRect)) return [];
  const regions: PdfSelectionRegion[] = [];
  const seen = new Set<string>();
  for (const rect of rects) {
    if (!validRect(rect)) continue;
    const left = Math.max(pageRect.left, rect.left);
    const top = Math.max(pageRect.top, rect.top);
    const right = Math.min(pageRect.left + pageRect.width, rect.left + rect.width);
    const bottom = Math.min(pageRect.top + pageRect.height, rect.top + rect.height);
    if (right <= left || bottom <= top) continue;
    const key = `${left},${top},${right},${bottom}`;
    if (seen.has(key)) continue;
    seen.add(key);
    regions.push({ x: (left - pageRect.left) / pageRect.width, y: (top - pageRect.top) / pageRect.height,
      width: (right - left) / pageRect.width, height: (bottom - top) / pageRect.height });
  }
  return regions;
}

type NodeText = { start: number; end: number; childOffsets: number[] };
type TextSegment = { node: Node; start: number; end: number; lineBreak: boolean };

/** PDF.js represents line endings as BR nodes, which textContent alone omits. */
function readLayerText(textLayer: HTMLElement) {
  let documentText = "";
  const positions = new Map<Node, NodeText>();
  const segments: TextSegment[] = [];
  const visit = (node: Node) => {
    const start = documentText.length;
    const childOffsets = [start];
    const lineBreak = node.nodeType === 1 && node.nodeName.toUpperCase() === "BR";
    if (node.nodeType === 3 || lineBreak) {
      documentText += lineBreak ? "\n" : node.nodeValue ?? "";
      if (documentText.length > start) segments.push({ node, start, end: documentText.length, lineBreak });
    } else {
      for (const child of Array.from(node.childNodes)) { visit(child); childOffsets.push(documentText.length); }
    }
    positions.set(node, { start, end: documentText.length, childOffsets });
  };
  visit(textLayer);
  return { documentText, positions, segments };
}

type LayerText = ReturnType<typeof readLayerText>;

function readBoundary(model: LayerText, node: Node, offset: number): number | null {
  const position = model.positions.get(node);
  if (!position || !Number.isInteger(offset) || offset < 0) return null;
  if (node.nodeType === 3) return offset <= position.end - position.start ? position.start + offset : null;
  return node.nodeType === 1 && offset < position.childOffsets.length ? position.childOffsets[offset] : null;
}

function rangeAtOffsets(textLayer: HTMLElement, model: LayerText, start: number, end: number): Range | null {
  const first = model.segments.find(segment => start >= segment.start && start < segment.end);
  const last = model.segments.find(segment => end > segment.start && end <= segment.end);
  if (!first || !last) return null;
  const range = textLayer.ownerDocument.createRange();
  if (first.lineBreak) range.setStartBefore(first.node);
  else range.setStart(first.node, start - first.start);
  if (last.lineBreak) range.setEndAfter(last.node);
  else range.setEnd(last.node, end - last.start);
  return range;
}

/** Reads only one page; all offsets are UTF16 indices in the returned snapshot. */
export function readPdfTextSelection({ selection, textLayer, pageRect, pageIndex }: {
  selection: Selection | null;
  textLayer: HTMLElement;
  pageRect: PageRect;
  pageIndex: number;
}): PdfTextSelection | null {
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed || !Number.isInteger(pageIndex) || pageIndex < 0) return null;
  try {
    const selected = selection.getRangeAt(0);
    if (!textLayer.contains(selected.startContainer) || !textLayer.contains(selected.endContainer)) return null;
    const model = readLayerText(textLayer);
    const start = readBoundary(model, selected.startContainer, selected.startOffset);
    const end = readBoundary(model, selected.endContainer, selected.endOffset);
    if (start === null || end === null) return null;
    const text = normalizePdfTextRange(model.documentText, start, end);
    if (!text) return null;
    const range = rangeAtOffsets(textLayer, model, text.selectionStart, text.selectionEnd);
    const regions = range ? normalizePdfSelectionRects(range.getClientRects(), pageRect) : [];
    if (!regions.length) return null;
    const x = Math.min(...regions.map(rect => rect.x));
    const y = Math.min(...regions.map(rect => rect.y));
    const right = Math.max(...regions.map(rect => rect.x + rect.width));
    const bottom = Math.max(...regions.map(rect => rect.y + rect.height));
    return { ...text, pageIndex, region: { x, y, width: right - x, height: bottom - y },
      rect: { left: pageRect.left + x * pageRect.width, bottom: pageRect.top + bottom * pageRect.height } };
  } catch { return null; }
}

/** A changed page snapshot invalidates the anchor; duplicate text is never searched. */
export function getPdfTextAnchorRects({ textLayer, pageRect, documentText, selectionStart, selectionEnd, quote }: {
  textLayer: HTMLElement;
  pageRect: PageRect;
  documentText: string;
  selectionStart: number;
  selectionEnd: number;
  quote?: string;
}): PdfSelectionRegion[] {
  try {
    const model = readLayerText(textLayer);
    if (model.documentText !== documentText) return [];
    const text = normalizePdfTextRange(documentText, selectionStart, selectionEnd);
    if (!text || (quote !== undefined && documentText.slice(selectionStart, selectionEnd) !== quote)) return [];
    const range = rangeAtOffsets(textLayer, model, text.selectionStart, text.selectionEnd);
    return range ? normalizePdfSelectionRects(range.getClientRects(), pageRect) : [];
  } catch { return []; }
}
