export const canvasZoomMin = 0.45;
export const canvasZoomMax = 1.4;
export const canvasZoomStep = 0.1;

const roundZoom = (value: number) => Math.round(value * 100) / 100;

export function clampCanvasZoom(value: number) {
  return roundZoom(Math.min(canvasZoomMax, Math.max(canvasZoomMin, value)));
}

export function stepCanvasZoom(value: number, direction: -1 | 1) {
  return clampCanvasZoom(value + direction * canvasZoomStep);
}

export function getFitCanvasZoom({
  contentHeight,
  contentWidth,
  viewportHeight,
  viewportWidth,
}: {
  contentHeight: number;
  contentWidth: number;
  viewportHeight: number;
  viewportWidth: number;
}) {
  if (contentHeight <= 0 || contentWidth <= 0 || viewportHeight <= 0 || viewportWidth <= 0) return 1;
  const fit = Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight, 1) * 0.96;
  return fit >= 0.96 ? 1 : clampCanvasZoom(fit);
}

export function getCanvasPanPosition({
  currentX,
  currentY,
  originLeft,
  originTop,
  startX,
  startY,
}: {
  currentX: number;
  currentY: number;
  originLeft: number;
  originTop: number;
  startX: number;
  startY: number;
}) {
  return {
    left: Math.max(0, originLeft - (currentX - startX)),
    top: Math.max(0, originTop - (currentY - startY)),
  };
}
