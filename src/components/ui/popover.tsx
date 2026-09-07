import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({ align = "start", anchor, collisionPadding, positionMethod, positionerClassName, className, side = "bottom", sideOffset = 8, ...props }: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, "align" | "anchor" | "collisionPadding" | "positionMethod" | "side" | "sideOffset"> & { positionerClassName?: string }) {
  return <PopoverPrimitive.Portal><PopoverPrimitive.Positioner align={align} anchor={anchor} collisionPadding={collisionPadding} positionMethod={positionMethod} className={cn("isolate z-50 outline-none", positionerClassName)} side={side} sideOffset={sideOffset}><PopoverPrimitive.Popup className={cn("z-50 rounded-xl bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className)} data-slot="popover-content" {...props} /></PopoverPrimitive.Positioner></PopoverPrimitive.Portal>;
}

function PopoverClose(props: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export { Popover, PopoverClose, PopoverContent, PopoverTrigger };
