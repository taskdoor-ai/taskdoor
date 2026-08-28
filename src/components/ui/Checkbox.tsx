import { Check } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";

type CheckboxSize = "sm" | "md" | "touch";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  size?: CheckboxSize;
};

type CheckboxIndicatorProps = {
  checked: boolean;
  className?: string;
  size?: CheckboxSize;
};

function checkboxClassName(size: CheckboxSize, className?: string) {
  return ["ui-checkbox", `ui-checkbox-${size}`, className].filter(Boolean).join(" ");
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, size = "md", ...props },
  ref,
) {
  return <span className={checkboxClassName(size, className)}>
    <input {...props} className="ui-checkbox-input" ref={ref} type="checkbox" />
    <span aria-hidden="true" className="ui-checkbox-control"><Check /></span>
  </span>;
});

export function CheckboxIndicator({ checked, className, size = "md" }: CheckboxIndicatorProps) {
  return <span aria-hidden="true" className={`${checkboxClassName(size, className)}${checked ? " is-checked" : ""}`}>
    <span className="ui-checkbox-control"><Check /></span>
  </span>;
}
