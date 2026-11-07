export type DiscussionReferenceTask = { id: string; number: number; title: string; goal?: string; completionCriteria?: string[] };

const taskReferenceFragment = "#taskdoor-task=";
const taskQueryPattern = /(^|[\s\p{Script=Han}（(：:，、。])(#([^\s#@][^\r\n#@]{0,74})?)$/u;

export function readDiscussionTaskQuery(text: string) {
  const match = taskQueryPattern.exec(text);
  if (!match) return null;
  const [ , boundary, replaceableString, matchingString = "" ] = match;
  return { leadOffset: match.index + boundary.length, matchingString, replaceableString };
}

export function searchDiscussionReferenceTasks(tasks: DiscussionReferenceTask[], query: string): DiscussionReferenceTask[] {
  const keyword = query.trim().toLocaleLowerCase();
  if (!keyword) return [...tasks];
  if (/^\d+$/.test(keyword)) return tasks.filter(task => String(task.number) === keyword);
  return tasks.filter(task => task.title.toLocaleLowerCase().includes(keyword));
}

export function formatDiscussionTaskReference(task: Pick<DiscussionReferenceTask, "id" | "number">): string {
  return `[${task.number}](<${taskReferenceFragment}${encodeURIComponent(task.id)}>)`;
}

export function isDiscussionTaskReference(href: string | undefined): href is string {
  return href?.startsWith(taskReferenceFragment) ?? false;
}

export function readDiscussionTaskReference(href: string): string | null {
  try {
    return decodeURIComponent(href.slice(taskReferenceFragment.length)) || null;
  } catch {
    return null;
  }
}
