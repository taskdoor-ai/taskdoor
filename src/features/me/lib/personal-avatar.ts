export const personalAvatarMaxBytes = 2 * 1024 * 1024;
const supportedPersonalAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const personalAvatarMaxDimension = 512;

export function validatePersonalAvatarFile(file: { size: number; type: string }) {
  if (!supportedPersonalAvatarTypes.has(file.type)) return "请选择 JPG、PNG 或 WebP 图片";
  if (file.size > personalAvatarMaxBytes) return "图片不能超过 2 MB";
  return "";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("无法读取这张图片，请重新选择"));
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("无法读取这张图片，请重新选择"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("图片内容无法识别，请选择其他图片"));
    image.onload = () => resolve(image);
    image.src = dataUrl;
  });
}

export async function createPersonalAvatarDataUrl(file: File) {
  const validationError = validatePersonalAvatarFile(file);
  if (validationError) throw new Error(validationError);
  const source = await readFileAsDataUrl(file);
  if (typeof document === "undefined" || typeof Image === "undefined") return source;

  const image = await loadImage(source);
  const scale = Math.min(1, personalAvatarMaxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(image, 0, 0, width, height);
  const compressed = canvas.toDataURL("image/webp", 0.86);
  return compressed.startsWith("data:image/") ? compressed : source;
}
