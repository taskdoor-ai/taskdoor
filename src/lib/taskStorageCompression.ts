/** Lossless UTF-8 LZW for large recovery snapshots; no task data is discarded. */
export function compressStorageText(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const codes: number[] = [];
  let dictionary = new Map<string, number>();
  let next = 257;
  let word = '';
  for (const byte of bytes) {
    const char = String.fromCharCode(byte);
    const combined = word + char;
    if (combined.length === 1 || dictionary.has(combined)) { word = combined; continue; }
    codes.push(word.length === 1 ? word.charCodeAt(0) : dictionary.get(word)!);
    if (next < 65536) dictionary.set(combined, next++);
    else { codes.push(256); dictionary = new Map(); next = 257; }
    word = char;
  }
  if (word) codes.push(word.length === 1 ? word.charCodeAt(0) : dictionary.get(word)!);
  const chunks: string[] = [];
  for (let offset = 0; offset < codes.length; offset += 4096) {
    chunks.push(String.fromCharCode(...codes.slice(offset, offset + 4096).flatMap(code => [code >> 8, code & 255])));
  }
  return btoa(chunks.join(''));
}

export function decompressStorageText(payload: string): string {
  const binary = atob(payload);
  if (binary.length % 2) throw new Error('Invalid compressed storage');
  let dictionary: string[] = [];
  let next = 257;
  let previous = '';
  const chunks: string[] = [];
  let length = 0;
  for (let i = 0; i < binary.length; i += 2) {
    const code = (binary.charCodeAt(i) << 8) | binary.charCodeAt(i + 1);
    if (code === 256) { dictionary = []; next = 257; previous = ''; continue; }
    const word = code < 256 ? String.fromCharCode(code) : dictionary[code] ?? (code === next && previous ? previous + previous[0] : undefined);
    if (word === undefined) throw new Error('Invalid compressed storage code');
    length += word.length;
    if (length > 32 * 1024 * 1024) throw new Error('Recovery snapshot is too large');
    chunks.push(word);
    if (previous && next < 65536) dictionary[next++] = previous + word[0];
    previous = word;
  }
  const bytes = Uint8Array.from(chunks.join(''), char => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
