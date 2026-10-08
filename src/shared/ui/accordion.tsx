"use client"

import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

// Source anatomy: shadcn Accordion as distributed through 21st.dev.
// TaskDoor keeps the Radix keyboard contract and owns the visual tokens.
const Accordion = AccordionPrimitive.Root

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("ad-accordion-item", className)} {...props} />
}

function AccordionTrigger({ children, className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return <AccordionPrimitive.Header className="ad-accordion-header">
    <AccordionPrimitive.Trigger className={cn("ad-accordion-trigger", className)} {...props}>
      {children}
      <ChevronDown aria-hidden="true" className="ad-accordion-chevron" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
}

function AccordionContent({ children, className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return <AccordionPrimitive.Content className={cn("ad-accordion-content", className)} {...props}>
    <div className="ad-accordion-content-inner">{children}</div>
  </AccordionPrimitive.Content>
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
