import { useModuleCopy } from "../../i18n/moduleMessages";
import { type ReactNode } from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";

type ToastOptions = {
  id?: string;
  description?: string;
  action?: { label: string; onClick: () => void | boolean };
  onClose?: () => void;
};
type ToastTone = "success" | "error" | "info";
const manager = ToastPrimitive.createToastManager();

function show(message: string, type: ToastTone, options: ToastOptions = {}) {
  const id = options.id ?? `${type}:${message}`;
  return manager.add({
    id, title: message, type, description: options.description,
    timeout: options.action ? 8000 : type === "error" ? 6000 : 4000,
    priority: type === "error" ? "high" : "low",
    onClose: options.onClose,
    actionProps: options.action ? {
      children: options.action.label,
      onClick: () => {
        // A failed action can keep its toast available for another attempt.
        if (options.action?.onClick() !== false) manager.close(id);
      },
    } : undefined,
  });
}

/** Operation feedback only; field errors and persistent page states stay inline. */
export const toast = {
  success: (message: string, options?: ToastOptions) => show(message, "success", options),
  error: (message: string, options?: ToastOptions) => show(message, "error", options),
  info: (message: string, options?: ToastOptions) => show(message, "info", options),
  dismiss: (id: string) => manager.close(id),
};

/** Mount once per application, outside route and dialog lifecycles. */
export function ToastProvider({ children }: { children?: ReactNode }) {
  return <ToastPrimitive.Provider toastManager={manager} limit={3} timeout={4000}>
    {children}
    <ToastViewport />
  </ToastPrimitive.Provider>;
}

function ToastViewport() {
  const m = useModuleCopy();
  const { toasts } = ToastPrimitive.useToastManager();
  return <ToastPrimitive.Portal>
    <ToastPrimitive.Viewport className="ad-toast-viewport" aria-label={m("feedbackRegion")}>
      {toasts.map(item => {
        const Icon = item.type === "success" ? CircleCheck : item.type === "error" ? CircleAlert : Info;
        return <ToastPrimitive.Root key={item.id} toast={item} className="ad-toast" swipeDirection="up">
          <Icon className="ad-toast-icon" aria-hidden="true" size={18} />
          <ToastPrimitive.Content className="ad-toast-content">
            <ToastPrimitive.Title className="ad-toast-title" />
            <ToastPrimitive.Description className="ad-toast-description" />
          </ToastPrimitive.Content>
          <ToastPrimitive.Action className="ad-toast-action" />
          <ToastPrimitive.Close className="ad-toast-close" aria-label={m("closeFeedback")}><X size={16} aria-hidden="true" /></ToastPrimitive.Close>
        </ToastPrimitive.Root>;
      })}
    </ToastPrimitive.Viewport>
  </ToastPrimitive.Portal>;
}
