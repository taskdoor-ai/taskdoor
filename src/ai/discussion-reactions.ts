import type { DiscussionLike } from "@/features/tasks/discussion/lib/discussion-likes";

type SeedMessage = { id: string; author: string; createdAt?: string; time: string };

function hash(text: string) {
  let value = 0;
  for (const character of text) value = (value * 31 + character.charCodeAt(0)) >>> 0;
  return value;
}

/**
 * Demo likes for a task's seeded discussion, until anyone likes or unlikes there. Teammates who
 * took part in the thread like some messages; the viewer's own first message has a few likes, so
 * the author-only liker list can be seen.
 */
export function seedDiscussionLikes(messages: readonly SeedMessage[], viewerId: string): Record<string, DiscussionLike[]> {
  const people = [...new Set(messages.map(message => message.author))].filter(author => author && author !== viewerId && !/\bAI\b/.test(author));
  const likes: Record<string, DiscussionLike[]> = {};
  let ownSeeded = false;
  for (const message of messages) {
    const others = people.filter(person => person !== message.author);
    const own = message.author === viewerId;
    const count = own && !ownSeeded ? Math.min(3, others.length) : [0, 0, 1, 2][hash(message.id) % 4];
    if (own && count) ownSeeded = true;
    if (!count) continue;
    const base = Date.parse(message.createdAt ?? message.time.replace(" ", "T") + "+08:00");
    const start = Number.isFinite(base) ? base : Date.parse("2026-09-01T09:00:00+08:00");
    const offset = hash(message.id) % Math.max(1, others.length);
    likes[message.id] = Array.from({ length: Math.min(count, others.length) }, (_, index) => ({
      personId: others[(offset + index) % others.length],
      at: new Date(start + (index + 1) * 47 * 60_000).toISOString(),
    }));
  }
  return likes;
}
