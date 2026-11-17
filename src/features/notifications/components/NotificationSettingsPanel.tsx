import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { Settings } from "lucide-react";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  NOTIFICATION_PREFERENCES_CHANGED_EVENT,
  notificationPreferencesKey,
  readNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/features/notifications/lib/notification-preferences";

type PreferenceKey = keyof NotificationPreferences;
type BrowserError = "unsupported" | "denied" | "permission" | "unavailable";

export function NotificationSettingsPanel({ userId }: { userId: string }) {
  const ui = useGlobalUi();
  const descriptionId = useId();
  type State = {
    preferences: NotificationPreferences | null;
    error: "read" | null;
    saveErrors: Partial<Record<PreferenceKey, true>>;
    browserPending: boolean;
    browserError: BrowserError | null;
  };
  const read = useCallback((): Pick<State, "preferences" | "error"> => {
    if (typeof window === "undefined") return { preferences: null, error: null };
    try {
      return { preferences: readNotificationPreferences(localStorage, userId), error: null };
    } catch {
      return { preferences: null, error: "read" };
    }
  }, [userId]);
  const [{ preferences, error, saveErrors, browserPending, browserError }, setState] = useState<State>(() => ({ ...read(), saveErrors: {}, browserPending: false, browserError: null }));
  const patch = (next: Partial<State>) => setState(previous => ({ ...previous, ...next }));
  const reload = useCallback(() => setState(previous => ({ ...previous, ...read(), saveErrors: {}, browserError: null })), [read]);

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

  const save = (key: PreferenceKey, value: boolean) => {
    if (!preferences) return;
    const next = { ...preferences, [key]: value };
    try {
      saveNotificationPreferences(localStorage, userId, next);
      patch({ preferences: next, saveErrors: { ...saveErrors, [key]: undefined }, ...(key === "browser" ? { browserError: null } : {}) });
    } catch {
      patch({ saveErrors: { ...saveErrors, [key]: true } });
    }
  };

  const enableBrowser = async () => {
    if (typeof Notification === "undefined") return patch({ browserError: "unsupported" });
    if (Notification.permission === "granted") return save("browser", true);
    if (Notification.permission === "denied") return patch({ browserError: "denied" });
    patch({ browserPending: true, browserError: null });
    try {
      const permission = await Notification.requestPermission();
      patch({ browserPending: false });
      if (permission === "granted") save("browser", true);
      else patch({ browserError: permission === "denied" ? "denied" : "permission" });
    } catch {
      patch({ browserPending: false, browserError: "unavailable" });
    }
  };

  const changeBrowser = (enabled: boolean) => {
    if (enabled) void enableBrowser();
    else save("browser", false);
  };

  const option = (key: PreferenceKey, label: string, description: string, onChange: (value: boolean) => void, disabled = false) => {
    const labelId = `${descriptionId}-${key}-label`;
    const detailId = `${descriptionId}-${key}`;
    return (
      <label className="notification-settings-option" key={key}>
        <span className="notification-settings-copy">
          <span id={labelId}>{label}</span>
          <span className="notification-settings-description" id={detailId}>{description}</span>
        </span>
        <input
          aria-describedby={detailId}
          aria-disabled={disabled || undefined}
          aria-labelledby={labelId}
          checked={preferences?.[key] ?? false}
          className="sr-only"
          onChange={event => { if (!disabled) onChange(event.target.checked); }}
          onClick={event => { if (disabled) event.preventDefault(); }}
          role="switch"
          type="checkbox"
        />
        <span aria-hidden="true" data-slot="switch-track" />
      </label>
    );
  };

  return (
    <div className="notification-settings-panel">
      <h2 className="notification-settings-title">{ui("通知设置")}</h2>
      {error === "read" ? (
        <div>
          <p className="notification-settings-error" role="alert">{ui("通知设置读取失败，请重试。")}</p>
          <button className="notification-settings-retry" onClick={reload} type="button">{ui("重试")}</button>
        </div>
      ) : !preferences ? (
        <p aria-live="polite">{ui("正在读取通知设置…")}</p>
      ) : (
        <>
          {option("onlyRelated", ui("只接收与我相关的通知"), ui("站内及邮件只收直接相关通知，其他动态见活动。"), value => save("onlyRelated", value))}
          {saveErrors.onlyRelated && <p role="alert">{ui("通知设置保存失败，原设置已保留，请重试。")}</p>}
          <section className="notification-settings-email">
            {option("email", ui("同时发送邮件通知"), ui("仅 @你和回复的邮件；站内、登录和邀请不受影响。"), value => save("email", value))}
            {saveErrors.email && <p role="alert">{ui("邮件通知设置保存失败，原设置已保留，请重试。")}</p>}
          </section>
          <section className="notification-settings-browser">
            {option("browser", ui("浏览器通知"), ui("页面保持打开时，接收浏览器提醒。"), changeBrowser, browserPending)}
            {browserPending && <p role="status">{ui("请在浏览器提示中允许通知。")}</p>}
            {browserError && (
              <p role="status">
                {browserError === "unsupported" ? ui("当前环境不支持浏览器通知，请使用支持通知的浏览器并通过安全连接访问。")
                  : browserError === "denied" ? ui("浏览器已阻止通知。请在浏览器设置中允许 Taskdoor 发送通知，再重新开启。")
                  : browserError === "permission" ? ui("尚未获得通知权限，浏览器通知未开启。可再次点击开启。")
                  : ui("浏览器通知暂时无法开启，请稍后重试。")}
              </p>
            )}
            {saveErrors.browser && <p role="alert">{ui("无法保存浏览器通知设置，请检查浏览器的存储权限后重试。")}</p>}
          </section>
        </>
      )}
    </div>
  );
}

export function NotificationSettingsPopover({ userId, open, onOpenChange, portalContainer }: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalContainer: RefObject<HTMLDivElement | null>;
}) {
  const ui = useGlobalUi();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const title = ui("通知设置");
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
