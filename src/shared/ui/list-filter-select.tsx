import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Select as SelectRoot, SelectContent, SelectTrigger, SelectValue } from "./select";

type ListFilterSelectProps = {
  align?: "center" | "end" | "start";
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  label: string;
  onChange: (value: string) => void;
  size?: "default" | "sm" | "touch";
  value: string;
};

export function ListFilterSelect({ align = "center", ariaLabel, children, className, label, onChange, size = "default", value }: ListFilterSelectProps) {
  return <SelectRoot onValueChange={(nextValue) => onChange(nextValue as string)} value={value}>
    <SelectTrigger aria-label={ariaLabel} className={cn("workspace-filter-control", className)} size={size}><SelectValue>{label}</SelectValue></SelectTrigger>
    <SelectContent align={align} alignItemWithTrigger={false}>{children}</SelectContent>
  </SelectRoot>;
}
