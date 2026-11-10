import { Input as InputPrimitive } from "@base-ui/react/input"
import type * as React from "react"
import { useFocusVisible } from "react-aria/useFocusVisible"

import { cn } from "@/shared/lib/utils"

function Input({ className, leadingIcon, ...props }: React.ComponentProps<typeof InputPrimitive> & { leadingIcon?: React.ReactNode }) {
  const { isFocusVisible: keyboardFocus } = useFocusVisible({ isTextInput: true })
  const input = <InputPrimitive data-keyboard-focus={keyboardFocus || undefined} data-slot="input" className={cn("h-(--ad-control-height-md) w-full rounded-(--ad-radius-input) border border-(--ad-border) bg-(--ad-surface) px-(--ad-space-3) font-sans text-(length:--ad-text-body-sm) font-normal text-(--ad-ink) outline-none transition-[border-color] placeholder:text-(--ad-ink-tertiary) focus-visible:border-(--ad-input-focus) focus-visible:outline-none focus-visible:ring-0 aria-invalid:border-(--ad-danger) aria-invalid:focus-visible:border-(--ad-danger) data-invalid:border-(--ad-danger) data-invalid:focus-visible:border-(--ad-danger) disabled:cursor-not-allowed disabled:bg-(--ad-surface-subtle) disabled:text-(--ad-ink-tertiary)", className)} {...props} />
  if (!leadingIcon) return input
  return <span data-slot="input-shell"><span aria-hidden="true" data-slot="input-leading-icon">{leadingIcon}</span>{input}</span>
}

function Textarea({ className, variant = "default", ...props }: React.ComponentProps<"textarea"> & { variant?: "default" | "document" | "responsibility" }) {
  const { isFocusVisible: keyboardFocus } = useFocusVisible({ isTextInput: true })
  return <textarea data-keyboard-focus={keyboardFocus || undefined} data-slot="textarea" className={cn("min-h-[calc(var(--ad-control-height-lg)*2.5)] w-full resize-y rounded-(--ad-radius-input) border border-(--ad-border) bg-(--ad-surface) px-(--ad-space-3) py-(--ad-space-2) font-sans text-(length:--ad-text-body-sm) leading-6 text-(--ad-ink) outline-none transition-[border-color] placeholder:text-(--ad-ink-tertiary) focus-visible:border-(--ad-input-focus) focus-visible:outline-none focus-visible:ring-0 aria-invalid:border-(--ad-danger) aria-invalid:focus-visible:border-(--ad-danger) data-invalid:border-(--ad-danger) data-invalid:focus-visible:border-(--ad-danger) disabled:cursor-not-allowed disabled:bg-(--ad-surface-subtle) disabled:text-(--ad-ink-tertiary)", variant === "document" && "min-h-[calc(var(--ad-control-height-lg)*5)] leading-7", variant === "responsibility" && "min-h-(--ad-control-height-lg) resize-none", className)} {...props} />
}

export { Input, Textarea }
