type ImageRegion = { x: number; y: number; width: number; height: number };

function cropPreview(image: HTMLImageElement, x: number, y: number, width: number, height: number): string | undefined {
  if (!image.naturalWidth || !image.naturalHeight || width <= 0 || height <= 0) return;
  const left = Math.max(0, x - 6);
  const top = Math.max(0, y - 6);
  const right = Math.min(image.naturalWidth, x + width + 6);
  const bottom = Math.min(image.naturalHeight, y + height + 6);
  const scale = Math.min(1, 640 / (right - left), 320 / (bottom - top));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((right - left) * scale));
  canvas.height = Math.max(1, Math.round((bottom - top) * scale));
  const context = canvas.getContext("2d");
  if (!context) return;
  context.drawImage(image, left, top, right - left, bottom - top, 0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#5273ed"; context.lineWidth = 2;
  context.strokeRect(Math.max(1, (x - left) * scale), Math.max(1, (y - top) * scale), Math.max(1, Math.min(width * scale, canvas.width - 2)), Math.max(1, Math.min(height * scale, canvas.height - 2)));
  return canvas.toDataURL("image/png");
}

/** A bounded visual preview only; the source file and anchor remain authoritative. */
export function captureFileAnnotationImage(image: HTMLImageElement, region: ImageRegion): string | undefined {
  try { return cropPreview(image, region.x * image.naturalWidth, region.y * image.naturalHeight, region.width * image.naturalWidth, region.height * image.naturalHeight); }
  catch { return undefined; }
}

export async function captureFileAnnotationElement(element: HTMLElement, rect?: DOMRect): Promise<string | undefined> {
  try {
    const { toPng } = await import("html-to-image");
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    // backgroundColor also replaces the captured root's CSS background. Keep it
    // intact: a blue button with white text otherwise becomes white on white.
    const data = await toPng(element, { pixelRatio: 1, skipFonts: true, filter: node => !(node instanceof Element) || !node.hasAttribute("data-annotation-overlay") });
    const image = new Image(); image.src = data; await image.decode();
    if (!rect) return cropPreview(image, 0, 0, image.naturalWidth, image.naturalHeight);
    const scaleX = image.naturalWidth / bounds.width;
    const scaleY = image.naturalHeight / bounds.height;
    return cropPreview(image, (rect.left - bounds.left) * scaleX, (rect.top - bounds.top) * scaleY, rect.width * scaleX, rect.height * scaleY);
  } catch { return undefined; }
}
