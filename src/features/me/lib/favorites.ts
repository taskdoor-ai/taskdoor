import { createContext, useCallback, useContext, useMemo } from "react";
import { useStoredValue } from "@/shared/lib/useStoredValue";

/** Personal favorites across teams: tasks, discussion messages and files. Nobody else sees them. */
export type FavoriteKind = "task" | "discussion" | "file";
export type FavoriteRecord = {
  kind: FavoriteKind;
  teamId: string;
  taskId: string;
  /** The message or file; absent for a task. */
  targetId?: string;
  /** What the item read when it was saved: a message excerpt or a file name. */
  label?: string;
  createdAt: string;
};

export const favoritesStorageKey = (userId: string) => `agentdoor-favorites:${encodeURIComponent(userId)}`;
export const favoriteKey = (record: Pick<FavoriteRecord, "kind" | "teamId" | "taskId" | "targetId">) =>
  JSON.stringify([record.kind, record.teamId, record.taskId, record.targetId ?? ""]);

const kinds = new Set<FavoriteKind>(["task", "discussion", "file"]);
export function parseFavorites(raw: string | null): FavoriteRecord[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((item): item is FavoriteRecord => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      const valid = kinds.has(record.kind as FavoriteKind) && typeof record.teamId === "string" && typeof record.taskId === "string" && Boolean(record.taskId)
        && (record.kind === "task" ? record.targetId === undefined : typeof record.targetId === "string" && Boolean(record.targetId))
        && (record.label === undefined || typeof record.label === "string")
        && typeof record.createdAt === "string" && Number.isFinite(Date.parse(record.createdAt));
      if (!valid) return false;
      const key = favoriteKey(item as FavoriteRecord);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

/** The latest favorite first; saving an existing one again takes it away. */
export function toggleFavorite(records: readonly FavoriteRecord[], record: FavoriteRecord): FavoriteRecord[] {
  const key = favoriteKey(record);
  return records.some(item => favoriteKey(item) === key) ? records.filter(item => favoriteKey(item) !== key) : [record, ...records];
}

const noFavoritesKey = "agentdoor-favorites:";

export function useFavorites(userId: string) {
  const [stored, write] = useStoredValue(userId ? favoritesStorageKey(userId) : noFavoritesKey, parseFavorites);
  const records = userId ? stored : emptyFavorites;
  const keys = useMemo(() => new Set(records.map(favoriteKey)), [records]);
  const has = useCallback((record: Pick<FavoriteRecord, "kind" | "teamId" | "taskId" | "targetId">) => keys.has(favoriteKey(record)), [keys]);
  /** Returns the new state, or null when it could not be saved. */
  const toggle = useCallback((record: Omit<FavoriteRecord, "createdAt">) => {
    if (!userId) return null;
    let active = false;
    const saved = write(current => {
      const next = toggleFavorite(current, { ...record, createdAt: new Date().toISOString() });
      active = next.some(item => favoriteKey(item) === favoriteKey(record));
      return next;
    });
    return saved ? active : null;
  }, [userId, write]);
  return { records, has, toggle };
}

const emptyFavorites: FavoriteRecord[] = [];

/** Who is saving favorites and in which team; without it, favorite entries are not offered. */
export const FavoritesScope = createContext<{ userId: string; teamId: string } | null>(null);

/**
 * One favorite entry: whether it is saved and how to toggle it. `toggle` returns the new state,
 * or null when it could not be saved.
 */
export function useFavorite(kind: FavoriteKind, taskId: string, targetId?: string) {
  const scope = useContext(FavoritesScope);
  const { has, toggle } = useFavorites(scope?.userId ?? "");
  const record = scope && taskId ? { kind, teamId: scope.teamId, taskId, ...(targetId ? { targetId } : {}) } : null;
  return {
    available: Boolean(record),
    active: record ? has(record) : false,
    toggle: (label?: string) => record ? toggle({ ...record, ...(label ? { label } : {}) }) : null,
  };
}
