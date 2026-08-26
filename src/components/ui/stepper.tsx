import type { LucideIcon } from "lucide-react";
import { createContext, type CSSProperties, type ReactNode, useContext } from "react";

export type StepItem = {
  description?: string;
  icon?: LucideIcon;
  label: string;
};

type StepperContextValue = {
  activeStep: number;
  steps: readonly StepItem[];
};

const StepperContext = createContext<StepperContextValue | null>(null);

type StepperProps = {
  children: ReactNode;
  className?: string;
  initialStep: number;
  steps: readonly StepItem[];
  variables?: CSSProperties;
};

export function Stepper({ children, className = "", initialStep, steps, variables }: StepperProps) {
  return <StepperContext.Provider value={{ activeStep: initialStep, steps }}>
    <div className={`nyxb-stepper ${className}`} style={variables}>{children}</div>
  </StepperContext.Provider>;
}

type StepProps = StepItem & {
  index: number;
};

export function Step({ description, icon: Icon, index, label }: StepProps) {
  const context = useContext(StepperContext);
  if (!context) throw new Error("Step must be used inside Stepper");
  const active = context.activeStep === index;
  const completed = context.activeStep > index;

  return <div className="nyxb-horizontal-step" data-active={active} data-completed={completed}>
    <div className="nyxb-horizontal-step-container">
      <span className="nyxb-step-button-container">{Icon ? <Icon aria-hidden="true" /> : index + 1}</span>
      <span className="nyxb-step-label-container">
        <strong className="nyxb-step-label">{label}</strong>
        {description && <small className="nyxb-step-description">{description}</small>}
      </span>
    </div>
  </div>;
}
