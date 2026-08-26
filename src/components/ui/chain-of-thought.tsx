"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  ExternalLink,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "../../lib/utils";

type StepStatus = "pending" | "active" | "complete";

interface AiChainOfThoughtContextValue {
  isOpen: boolean;
}

const AiChainOfThoughtContext = React.createContext<AiChainOfThoughtContextValue | null>(null);

function useChainOfThoughtContext() {
  const context = React.useContext(AiChainOfThoughtContext);
  if (!context) {
    throw new Error("AiChainOfThought components must be used within <AiChainOfThought>");
  }
  return context;
}

interface AiChainOfThoughtProps {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

function AiChainOfThought({
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: AiChainOfThoughtProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!isControlled) setUncontrolledOpen(open);
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange],
  );

  const contextValue = React.useMemo(() => ({ isOpen }), [isOpen]);

  return (
    <AiChainOfThoughtContext.Provider value={contextValue}>
      <CollapsiblePrimitive.Root
        data-slot="ai-chain-of-thought"
        open={isOpen}
        onOpenChange={handleOpenChange}
        className={cn(
          "rounded-lg border border-border bg-card text-card-foreground overflow-hidden",
          className,
        )}
      >
        {children}
      </CollapsiblePrimitive.Root>
    </AiChainOfThoughtContext.Provider>
  );
}

interface AiChainOfThoughtHeaderProps {
  title?: string;
  stepCount?: number;
  completedCount?: number;
  children?: React.ReactNode;
  className?: string;
}

function AiChainOfThoughtHeader({
  title = "Chain of Thought",
  stepCount,
  completedCount,
  children,
  className,
}: AiChainOfThoughtHeaderProps) {
  const { isOpen } = useChainOfThoughtContext();

  return (
    <CollapsiblePrimitive.Trigger
      data-slot="ai-chain-of-thought-header"
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="chain-icon">
        <Lightbulb />
      </div>
      <div className="chain-heading">
        <span>{title}</span>
        {stepCount !== undefined && (
          <span className="chain-count">
            {completedCount !== undefined ? `${completedCount}/${stepCount}` : `${stepCount} steps`}
          </span>
        )}
      </div>
      {children}
      <ChevronDown className={cn("chain-chevron", isOpen && "rotate-180")} />
    </CollapsiblePrimitive.Trigger>
  );
}

interface AiChainOfThoughtContentProps {
  children?: React.ReactNode;
  className?: string;
}

function AiChainOfThoughtContent({ children, className }: AiChainOfThoughtContentProps) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="ai-chain-of-thought-content"
      className={cn(
        "border-t border-border data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        className,
      )}
    >
      <div className="chain-content-inner">{children}</div>
    </CollapsiblePrimitive.Content>
  );
}

interface AiChainOfThoughtStepProps {
  status: StepStatus;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

function AiChainOfThoughtStep({
  status,
  title,
  description,
  children,
  className,
}: AiChainOfThoughtStepProps) {
  const statusConfig = React.useMemo(() => {
    const configs: Record<StepStatus, { icon: React.ReactNode }> = {
      pending: { icon: <Circle /> },
      active: { icon: <Loader2 className="chain-spinner" /> },
      complete: { icon: <CheckCircle2 /> },
    };
    return configs[status];
  }, [status]);

  return (
    <div
      data-slot="ai-chain-of-thought-step"
      data-status={status}
      className={cn("relative flex gap-3", className)}
    >
      <div className="chain-step-rail">
        <div className="chain-step-icon">{statusConfig.icon}</div>
        <div className="chain-step-line" />
      </div>
      <div className="chain-step-body">
        <h4>{title}</h4>
        {description && <p>{description}</p>}
        {children && <div className="chain-step-extra">{children}</div>}
      </div>
    </div>
  );
}

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

interface AiChainOfThoughtSearchResultsProps {
  results: SearchResult[];
  className?: string;
}

function AiChainOfThoughtSearchResults({ results, className }: AiChainOfThoughtSearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div data-slot="ai-chain-of-thought-search-results" className={cn("space-y-2", className)}>
      <div className="chain-search-label">
        <Search />
        <span>找到 {results.length} 个来源</span>
      </div>
      <div className="chain-search-results">
        {results.map((result, index) => (
          <a key={index} href={result.url} className="chain-search-result">
            <div>
              <h5>{result.title}</h5>
              {result.snippet && <p>{result.snippet}</p>}
            </div>
            <ExternalLink />
          </a>
        ))}
      </div>
    </div>
  );
}

interface AiChainOfThoughtImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}

function AiChainOfThoughtImage({ src, alt, caption, className }: AiChainOfThoughtImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  return (
    <figure data-slot="ai-chain-of-thought-image" className={cn("space-y-2", className)}>
      <div className="chain-image-frame">
        {isLoading && <Loader2 className="chain-image-loader" />}
        {hasError ? (
          <div className="chain-image-error">
            <ImageIcon />
            <p>图片加载失败</p>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            onLoad={() => setIsLoading(false)}
            onError={() => { setIsLoading(false); setHasError(true); }}
            className={isLoading ? "is-loading" : ""}
          />
        )}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export {
  AiChainOfThought,
  AiChainOfThoughtHeader,
  AiChainOfThoughtContent,
  AiChainOfThoughtStep,
  AiChainOfThoughtSearchResults,
  AiChainOfThoughtImage,
};
export type { AiChainOfThoughtProps, StepStatus, SearchResult };

export default AiChainOfThought;
