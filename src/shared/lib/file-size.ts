type FileSizeFormatOptions = {
  /** Retain historical display-only values when exact bytes are unavailable. */
  fallback?: string;
  fractionDigits?: number;
};

/** Decimal file sizes: 1 KB = 1,000 bytes and 1 MB = 1,000,000 bytes. */
export function formatFileSize(bytes: number | undefined, { fallback = "", fractionDigits = 1 }: FileSizeFormatOptions = {}): string {
  if (bytes === undefined || !Number.isSafeInteger(bytes) || bytes < 0) return fallback;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = bytes;
  let unit = 0;
  while (amount >= 1000 && unit < units.length - 1) { amount /= 1000; unit++; }
  if (unit === 0) return `${bytes} B`;
  if (Number(amount.toFixed(fractionDigits)) >= 1000 && unit < units.length - 1) { amount /= 1000; unit++; }
  return `${amount.toFixed(fractionDigits)} ${units[unit]}`;
}
