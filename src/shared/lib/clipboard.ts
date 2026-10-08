type CopyTextOptions = {
  legacyCopy?: (value: string) => boolean;
  writeText?: (value: string) => Promise<void>;
};

const legacyCopyText = (value: string) => {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.inset = "-9999px auto auto -9999px";
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, value.length);
  const copied = document.execCommand("copy");
  field.remove();
  return copied;
};

export async function copyTextToClipboard(value: string, options: CopyTextOptions = {}) {
  const writeText = options.writeText ?? (navigator.clipboard?.writeText
    ? navigator.clipboard.writeText.bind(navigator.clipboard)
    : undefined);
  try {
    if (!writeText) throw new Error("Clipboard API unavailable");
    await writeText(value);
  } catch {
    const copied = (options.legacyCopy ?? legacyCopyText)(value);
    if (!copied) throw new Error("Clipboard copy failed");
  }
}
