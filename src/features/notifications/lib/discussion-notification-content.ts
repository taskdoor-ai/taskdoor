/** Keep the new message verbatim; a message containing only mentions has no body excerpt. */
export function discussionNotificationExcerpt(body: string, memberNames: readonly string[], mentionsAll = false): string | undefined {
  const excerpt = body.trim();
  if (!excerpt) return undefined;
  let remaining = excerpt;
  const labels = [...memberNames.filter(Boolean).map(name => `@${name}`), ...(mentionsAll ? ["@全体成员", "@all", "@everyone", "@All members"] : [])];
  for (const label of labels.sort((first, second) => second.length - first.length)) remaining = remaining.split(label).join("");
  return remaining.replace(/[\s@,，、;；。.!！?？:：]/g, "") ? excerpt : undefined;
}
