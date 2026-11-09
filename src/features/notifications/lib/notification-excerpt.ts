/**
 * The excerpt as the notification shows it: blank lines dropped, trailing spaces trimmed,
 * each written line break kept. Empty when nothing is left, so no quote box is drawn.
 */
export function notificationExcerptText(excerpt: string | undefined) {
  return (excerpt ?? "").split(/\r?\n/).map(line => line.trimEnd()).filter(line => line.trim()).join("\n");
}
