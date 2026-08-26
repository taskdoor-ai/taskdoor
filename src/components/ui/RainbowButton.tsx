import { forwardRef, type ButtonHTMLAttributes } from "react";

type RainbowButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const RainbowButton = forwardRef<HTMLButtonElement, RainbowButtonProps>(
  ({ className = "", ...props }, ref) => (
    <button
      className={["rainbow-button", className].filter(Boolean).join(" ")}
      ref={ref}
      type="button"
      {...props}
    />
  ),
);

RainbowButton.displayName = "RainbowButton";
