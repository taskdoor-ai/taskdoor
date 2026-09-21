import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-(--ad-radius-control) border border-transparent bg-clip-padding font-sans text-(length:--ad-text-body-sm) font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-pressed:bg-(--ad-control-selected-bg) aria-pressed:!text-(--ad-control-selected-ink) aria-pressed:shadow-(--ad-shadow-control-selected) aria-current-page:bg-(--ad-control-selected-bg) aria-current-page:!text-(--ad-control-selected-ink) aria-current-page:shadow-(--ad-shadow-control-selected) dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary !text-primary-foreground hover:bg-[var(--ad-route-hover)] active:bg-[var(--ad-route-active)] disabled:bg-[var(--ad-control-disabled-bg)] disabled:!text-[color:var(--ad-control-disabled-ink)] disabled:opacity-100",
        outline:
          "border-border bg-background text-secondary-foreground hover:border-[var(--ad-control-border-hover)] hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        ai:
          "bg-[var(--ad-route-soft)] !text-[color:var(--ad-route-ink)] hover:bg-[var(--ad-route-soft-hover)] hover:!text-[color:var(--ad-route-ink)]",
        inference:
          "bg-[var(--ad-inference-soft)] !text-[color:var(--ad-inference)] hover:bg-[var(--ad-inference-hover)] hover:!text-[color:var(--ad-inference)]",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-(--ad-control-height-md) gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-(--ad-control-height-xs) gap-1 px-2 text-(length:--ad-text-caption) in-data-[slot=button-group]:rounded-(--ad-radius-control) has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-(--ad-control-height-sm) gap-1 px-2.5 text-(length:--ad-text-caption) in-data-[slot=button-group]:rounded-(--ad-radius-control) has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-(--ad-control-height-lg) gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        touch: "h-(--ad-control-touch-min) gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        icon: "size-(--ad-control-height-md)",
        "icon-xs":
          "size-(--ad-control-height-xs) rounded-lg in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-(--ad-control-height-sm) rounded-lg in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-(--ad-control-height-lg)",
        "icon-touch": "size-(--ad-control-touch-min)",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
