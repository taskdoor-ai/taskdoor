export type AnnotationToolbarPosition = { left: number; top: number };
export type AnnotationToolbarSize = { width: number; height: number };

export function clampAnnotationToolbarPosition(position: AnnotationToolbarPosition, size: AnnotationToolbarSize, viewport: AnnotationToolbarSize, margin = 12): AnnotationToolbarPosition {
  const clampAxis = (value: number, length: number, available: number) => {
    const edge = Math.max(0, Math.min(margin, (available - length) / 2));
    return Math.min(Math.max(value, edge), Math.max(edge, available - length - edge));
  };
  return { left: clampAxis(position.left, size.width, viewport.width), top: clampAxis(position.top, size.height, viewport.height) };
}
