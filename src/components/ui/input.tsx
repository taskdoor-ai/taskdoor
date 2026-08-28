import { Input as InputPrimitive } from "@base-ui/react/input"
import type * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, leadingIcon, ...props }: React.ComponentProps<typeof InputPrimitive> & { leadingIcon?: React.ReactNode }) {
  const input = <InputPrimitive data-slot="input" className={cn("h-(--ad-control-height-md) w-full rounded-(--ad-radius-control) border border-(--ad-border) bg-(--ad-surface) px-(--ad-space-3) text-sm text-(--ad-ink) outline-none transition-[border-color] placeholder:text-(--ad-ink-tertiary) focus-visible:border-(--ad-focus) focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-(--ad-surface-subtle) disabled:text-(--ad-ink-tertiary)", className)} {...props} />
  if (!leadingIcon) return input
  return <span data-slot="input-shell"><span aria-hidden="true" data-slot="input-leading-icon">{leadingIcon}</span>{input}</span>
}

function Textarea({ className, variant = "default", ...props }: React.ComponentProps<"textarea"> & { variant?: "default" | "document" | "responsibility" }) {
  return <textarea data-slot="textarea" className={cn("min-h-[calc(var(--ad-control-height-lg)*2.5)] w-full resize-y rounded-(--ad-radius-control) border border-(--ad-border) bg-(--ad-surface) px-(--ad-space-3) py-(--ad-space-2) text-sm leading-6 text-(--ad-ink) outline-none transition-[border-color] placeholder:text-(--ad-ink-tertiary) focus-visible:border-(--ad-focus) focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-(--ad-surface-subtle) disabled:text-(--ad-ink-tertiary)", variant === "document" && "min-h-[calc(var(--ad-control-height-lg)*5)] leading-7", variant === "responsibility" && "min-h-(--ad-control-height-lg) resize-none", className)} {...props} />
}

export { Input, Textarea }
