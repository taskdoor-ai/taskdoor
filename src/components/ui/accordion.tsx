import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { cn } from "../../lib/utils";

export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = forwardRef<ElementRef<typeof AccordionPrimitive.Item>, ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>>(({ className, ...props }, ref) => <AccordionPrimitive.Item className={cn("ui-accordion-item", className)} ref={ref} {...props} />);
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = forwardRef<ElementRef<typeof AccordionPrimitive.Trigger>, ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>>(({ children, className, ...props }, ref) => <AccordionPrimitive.Header className="ui-accordion-header"><AccordionPrimitive.Trigger className={cn("ui-accordion-trigger", className)} ref={ref} {...props}>{children}<ChevronDown aria-hidden="true" className="ui-accordion-chevron" /></AccordionPrimitive.Trigger></AccordionPrimitive.Header>);
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = forwardRef<ElementRef<typeof AccordionPrimitive.Content>, ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>>(({ children, className, ...props }, ref) => <AccordionPrimitive.Content className="ui-accordion-content" ref={ref} {...props}><div className={cn("ui-accordion-content-inner", className)}>{children}</div></AccordionPrimitive.Content>);
AccordionContent.displayName = "AccordionContent";
