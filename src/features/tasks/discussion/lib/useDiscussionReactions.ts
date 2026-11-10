import { useCallback, useMemo } from "react";
import { seedDiscussionLikes } from "@/ai/discussion-reactions";
import { useStoredValue } from "@/shared/lib/useStoredValue";
import { discussionLikesStorageKey, parseDiscussionLikes, toggleDiscussionLike, type DiscussionLikes } from "@/features/tasks/discussion/lib/discussion-likes";
import { discussionPinsStorageKey, parseDiscussionPins, pinDiscussionMessage, unpinDiscussionMessage } from "@/features/tasks/discussion/lib/discussion-pins";
import type { CollaborationMessage } from "@/features/tasks/lib/task-collaboration";

/** A task's shared discussion pins and likes, kept per team and task. */
export function useDiscussionReactions(teamId: string, taskId: string, messages: readonly CollaborationMessage[], viewerId: string) {
  const [pins, writePins] = useStoredValue(discussionPinsStorageKey(teamId, taskId), parseDiscussionPins);
  const [storedLikes, writeLikes] = useStoredValue(discussionLikesStorageKey(teamId, taskId), parseDiscussionLikes);
  // Until anyone likes or unlikes in this task, the demo shows seeded likes.
  const seededLikes = useMemo<DiscussionLikes>(() => seedDiscussionLikes(messages, viewerId), [messages, viewerId]);
  const likes = storedLikes ?? seededLikes;
  // Pins of messages deleted since then free their slot, so the three-pin limit counts only what is shown.
  const pin = useCallback((messageId: string) => {
    const shown = new Set(messages.map(message => message.id));
    return writePins(current => pinDiscussionMessage(current.filter(item => shown.has(item.messageId)), messageId, new Date().toISOString(), viewerId));
  }, [writePins, viewerId, messages]);
  const unpin = useCallback((messageId: string) => writePins(current => unpinDiscussionMessage(current, messageId)), [writePins]);
  const toggleLike = useCallback((messageId: string) => writeLikes(current => toggleDiscussionLike(current ?? seededLikes, messageId, viewerId, new Date().toISOString())), [writeLikes, seededLikes, viewerId]);
  return { pins, pin, unpin, likes, toggleLike };
}
