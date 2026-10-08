/** Presentation timing for the explicit local Mock demo, not model/tool latency. */
const waitForDemoStep = (ms: number, signal: AbortSignal): Promise<boolean> => new Promise(resolve => {
  if (signal.aborted) { resolve(false); return; }
  const finish = (completed: boolean) => {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
    resolve(completed);
  };
  const cancel = () => finish(false);
  const timer = setTimeout(() => finish(true), ms);
  signal.addEventListener("abort", cancel, { once: true });
});

export async function playMockAiSteps(
  count: number,
  { signal, onStep, stepMs = 650 }: { signal: AbortSignal; onStep: (index: number) => void; stepMs?: number },
): Promise<boolean> {
  for (let index = 0; index < count; index += 1) {
    if (signal.aborted) return false;
    onStep(index);
    if (!await waitForDemoStep(stepMs, signal)) return false;
  }
  return !signal.aborted;
}
