"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/shared/lib/utils"

function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

type SheetContentProps = DialogPrimitive.Popup.Props & {
  side?: "left" | "right"
}

function SheetContent({ children, className, side = "left", ...props }: SheetContentProps) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Backdrop className="sheet-backdrop" data-side={side} data-slot="sheet-backdrop" />
    <DialogPrimitive.Popup className={cn("sheet-content", className)} data-side={side} data-slot="sheet-content" {...props}>
      {children}
    </DialogPrimitive.Popup>
  </DialogPrimitive.Portal>
}

function SheetHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("sheet-header", className)} data-slot="sheet-header" {...props} />
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title className={cn("sheet-title", className)} data-slot="sheet-title" {...props} />
}

export { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger }
