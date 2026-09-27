// Shared visual foundation for dialogs and confirmation dialogs.
export const dialogStyles = {
  content: "fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-[420px] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-xl bg-popover p-6 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  header: "flex flex-col gap-2 text-left",
  footer: "flex flex-row justify-end gap-2 [&>button]:min-w-16",
  title: "pr-4 font-heading text-base leading-normal font-medium break-words",
  description: "text-sm leading-relaxed text-pretty text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
  close: "absolute top-2 right-2",
} as const
