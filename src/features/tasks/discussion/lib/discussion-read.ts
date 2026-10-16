type DiscussionReadReport = {
  active: boolean;
  readable: boolean;
  content: HTMLElement | null;
  source?: HTMLElement | null;
  visibilityState: DocumentVisibilityState;
  activityIds: string[];
  onRead?: (activityIds: string[], readThrough: string) => void;
};

export function reportVisibleDiscussionRead({ active, readable, content, source, visibilityState, activityIds, onRead }: DiscussionReadReport): boolean {
  const isPresented = (element: HTMLElement | null) => Boolean(element?.getClientRects().length && !element.closest('[hidden], [aria-hidden="true"]'));
  if (!active || !readable || !onRead || visibilityState !== "visible" || !isPresented(content)) return false;
  if (source !== undefined && !isPresented(source)) return false;
  onRead(activityIds, new Date().toISOString());
  return true;
}
