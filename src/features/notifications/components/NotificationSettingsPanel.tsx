import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { Settings } from "lucide-react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  NOTIFICATION_PREFERENCES_CHANGED_EVENT,
  notificationPreferencesKey,
  readNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/features/notifications/lib/notification-preferences";

export function NotificationSettingsPanel({ userId }: { userId: string }) {
  const { locale } = useI18n();
  const english = locale === "en";
  const controlId = useId();
  const descriptionId = useId();
  type State = { preferences: NotificationPreferences | null; error: "read" | "save" | null };
  const read = useCallback((): State => {
    if (typeof window === "undefined") return { preferences: null, error: null };
    try {
      return { preferences: readNotificationPreferences(localStorage, userId), error: null };
    } catch {
      return { preferences: null, error: "read" };
    }
  }, [userId]);
  const [{ preferences, error }, setState] = useState<State>(read);
  const reload = useCallback(() => setState(read()), [read]);

  useEffect(() => {
    reload();
    if (!userId.trim()) return;
    const sync = (event: StorageEvent) => {
      if (event.key === null || event.key === notificationPreferencesKey(userId)) reload();
    };
    const syncLocal = (event: Event) => {
      if ((event as CustomEvent<{ userId: string }>).detail?.userId === userId) reload();
    };
    window.addEventListener("storage", sync);
    window.addEventListener(NOTIFICATION_PREFERENCES_CHANGED_EVENT, syncLocal);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(NOTIFICATION_PREFERENCES_CHANGED_EVENT, syncLocal);
    };
  }, [reload, userId]);

  const change = (onlyRelated: boolean) => {
    const next = { onlyRelated };
    try {
      saveNotificationPreferences(localStorage, userId, next);
      setState({ preferences: next, error: null });
    } catch {
      setState(previous => ({ ...previous, error: "save" }));
    }
  };

  return <div className="notification-settings-panel">
    <h2 className="notification-settings-title">{english ? "Notification settings" : "通知设置"}</h2>
    <div className="notification-settings-fields">
      {preferences ? <>
        <label className="notification-settings-switch" htmlFor={controlId}>
          <span>{english ? "Only notify me about messages related to me" : "仅通知与我相关的消息"}</span>
          <span className="relative flex shrink-0 items-center">
            <input aria-describedby={descriptionId} checked={preferences.onlyRelated} className="sr-only" id={controlId} onChange={event => change(event.target.checked)} role="switch" type="checkbox" />
            <span aria-hidden="true" data-slot="switch-track" />
          </span>
        </label>
        <p id={descriptionId}>{english
          ? "When enabled, only notify you about direct mentions, replies, collaboration invitations, assignments, handoffs and other activity directly related to you. View other updates in the activity log."
          : "开启后，仅接收 @你、回复你、协作邀请、任务指派和交接等与你直接相关的通知。其他动态可在活动记录中查看。"}</p>
      </> : !error && <p aria-live="polite">{english ? "Loading notification settings…" : "正在读取通知设置…"}</p>}
      {error && <div>
        <p className="notification-settings-error" role="alert">{error === "read"
          ? english ? "Could not load notification settings. Please retry." : "通知设置读取失败，请重试。"
          : english ? "Could not save notification settings. Your previous setting is unchanged." : "通知设置保存失败，仍使用原设置，请重试。"}</p>
        {error === "read" && <Button onClick={reload} size="sm" type="button" variant="link">{english ? "Retry" : "重试"}</Button>}
      </div>}
    </div>
  </div>;
}

export function NotificationSettingsPopover({ userId, open, onOpenChange, portalContainer }: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalContainer: RefObject<HTMLDivElement | null>;
}) {
  const { locale } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const title = locale === "en" ? "Notification settings" : "通知设置";
  return <Popover modal={false} open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger ref={triggerRef} render={<button aria-label={title} className="notification-settings-trigger" title={title} type="button" />}><Settings aria-hidden="true" /></PopoverTrigger>
    <PopoverContent align="end" aria-label={title} className="notification-settings-popover" collisionPadding={12} finalFocus={triggerRef} onKeyDownCapture={event => {
      if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
      // Consume this nested Escape before the Sheet's dismiss/focus recovery path.
      event.preventDefault();
      event.stopPropagation();
      onOpenChange(false);
      triggerRef.current?.focus({ preventScroll: true });
    }} portalContainer={portalContainer} positionMethod="fixed" positionerClassName="notification-filter-positioner" sideOffset={8}>
      <NotificationSettingsPanel key={userId} userId={userId} />
    </PopoverContent>
  </Popover>;
}
