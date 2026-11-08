/** One piece of generated text, revealed in order. */
export type MockRevealPart = { key: string; text: string };

export type MockRevealOptions = {
  signal: AbortSignal;
  /** Called with the visible prefix of a part each time it grows. */
  onReveal: (key: string, text: string) => void;
  /** Parts the person has taken over (e.g. by focusing the field); they complete at once. */
  isCompleted?: (key: string) => boolean;
  /** Steady demo pace; a live model streams its own tokens instead. */
  charMs?: number;
  instant?: boolean;
};

export const MOCK_REVEAL_CHAR_MS = 28;

export function prefersReducedMotion() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

const wait = (ms: number, signal: AbortSignal) => new Promise<boolean>(resolve => {
  if (signal.aborted) { resolve(false); return; }
  const done = () => { globalThis.clearTimeout(timer); signal.removeEventListener("abort", abort); };
  const abort = () => { done(); resolve(false); };
  const timer = globalThis.setTimeout(() => { done(); resolve(true); }, ms);
  signal.addEventListener("abort", abort, { once: true });
});

/**
 * Explicit local demo: reveal each part character by character, in order.
 * Pace follows elapsed time, so timer jitter does not slow the overall reveal.
 */
export async function revealMockTextParts(parts: MockRevealPart[], options: MockRevealOptions): Promise<boolean> {
  const charMs = options.charMs ?? MOCK_REVEAL_CHAR_MS;
  const instant = options.instant ?? prefersReducedMotion();
  for (const part of parts) {
    if (options.signal.aborted) return false;
    const characters = Array.from(part.text);
    if (instant || options.isCompleted?.(part.key) || characters.length === 0) {
      options.onReveal(part.key, part.text);
      continue;
    }
    const startedAt = performance.now();
    let shown = 0;
    while (shown < characters.length) {
      if (!await wait(charMs, options.signal)) return false;
      const next = options.isCompleted?.(part.key)
        ? characters.length
        : Math.min(characters.length, Math.max(shown + 1, Math.floor((performance.now() - startedAt) / charMs)));
      shown = next;
      options.onReveal(part.key, characters.slice(0, shown).join(""));
    }
  }
  return !options.signal.aborted;
}
