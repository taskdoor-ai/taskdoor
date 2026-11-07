import { useEffect, useRef, useState } from "react";
import { getSubtaskSuggestionStorageKey, readSubtaskSuggestionReview, type SubtaskSuggestion, type SubtaskSuggestionReview } from "@/features/tasks/lib/task-subtask-suggestions";

/** Drafts are separate from tasks; saving a review never assigns anyone or changes progress. */
export function useSubtaskSuggestionReview(teamId: string, taskId: string, suggestions: SubtaskSuggestion[]) {
  const key = getSubtaskSuggestionStorageKey(teamId, taskId);
  const read = () => ({ review: readSubtaskSuggestionReview(localStorage, teamId, taskId), raw: localStorage.getItem(key) });
  const [initial] = useState(() => {
    try { return { ...read(), error: "" }; }
    catch (cause) { return { review: { dismissedIds: [], edits: {} } as SubtaskSuggestionReview, raw: null, error: cause instanceof Error ? cause.message : "建议草稿读取失败，请重试。" }; }
  });
  const [review, setReview] = useState(initial.review);
  const [error, setError] = useState(initial.error);
  const latest = useRef(initial.review);
  const savedRaw = useRef(initial.raw);
  const blocked = useRef(Boolean(initial.error));
  const reload = () => {
    try {
      const loaded = read();
      latest.current = loaded.review; savedRaw.current = loaded.raw; blocked.current = false;
      setReview(loaded.review); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "建议草稿读取失败，请重试。"); blocked.current = true; }
  };
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === key) reload(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  const save = (next: SubtaskSuggestionReview, preserveUnsavedInput = true) => {
    if (blocked.current) return false;
    try {
      if (localStorage.getItem(key) !== savedRaw.current) {
        blocked.current = true;
        throw new Error("建议已在其他页面更新，请重新载入后核对。");
      }
      const raw = JSON.stringify(next);
      localStorage.setItem(key, raw);
      savedRaw.current = raw;
      latest.current = next; setReview(next); setError("");
      return true;
    } catch (cause) {
      // Keep the visible edit even when storage is temporarily full; confirmation can save it atomically.
      if (!blocked.current && preserveUnsavedInput) { latest.current = next; setReview(next); }
      setError(cause instanceof Error ? cause.message : "建议修改暂未保存，当前输入已保留。");
      return false;
    }
  };
  const change = (id: string, patch: Partial<SubtaskSuggestion>) => {
    const original = latest.current.edits[id] ?? suggestions.find(item => item.id === id);
    if (!original) return;
    save({ ...latest.current, edits: { ...latest.current.edits, [id]: { ...original, ...patch, id: original.id, source: original.source, contextKey: original.contextKey } } });
  };
  const dismissMany = (ids: string[]): boolean => {
    const previous = latest.current;
    const dismissedIds = [...new Set(ids)].filter(id => suggestions.some(item => item.id === id) && !previous.dismissedIds.includes(id));
    if (!dismissedIds.length) return false;
    return save({ ...previous, dismissedIds: [...previous.dismissedIds, ...dismissedIds] }, false);
  };
  const visible = suggestions.filter(item => !review.dismissedIds.includes(item.id)).map(item => {
    const edit = review.edits[item.id];
    const current = edit && edit.contextKey === item.contextKey && edit.discussionContextKey === item.discussionContextKey ? edit : item;
    return { ...current, participantIds: current.participantIds ?? [] };
  });
  const staleIds = suggestions.filter(item => !review.dismissedIds.includes(item.id) && review.edits[item.id] && review.edits[item.id].contextKey !== item.contextKey).map(item => item.id);
  const useLatest = () => { save({ ...latest.current, edits: Object.fromEntries(Object.entries(latest.current.edits).filter(([id]) => !staleIds.includes(id))) }); };
  const selectedIds = review.selectedIds === undefined ? visible.map(item => item.id) : review.selectedIds.filter(id => visible.some(item => item.id === id));
  const select = (ids: string[]) => { save({ ...latest.current, selectedIds: [...new Set(ids)].filter(id => visible.some(item => item.id === id)) }); };
  return { suggestions: visible, selectedIds, select, review, error, stale: staleIds.length > 0, useLatest, blocked: blocked.current, savedRaw, reload, change, dismissMany };
}
