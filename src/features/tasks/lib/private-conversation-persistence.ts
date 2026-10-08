type StorageWriter = Pick<Storage, "setItem">;

export function persistConversationList<T>(storage: StorageWriter, key: string, conversations: T[]): boolean {
  try {
    storage.setItem(key, JSON.stringify(conversations));
    return true;
  } catch {
    return false;
  }
}
