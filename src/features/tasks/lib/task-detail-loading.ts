/** Let the pending detail render before synchronous local creation starts. No minimum loading time. */
export function waitForTaskDetailPaint(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let firstFrame = 0;
    let secondFrame = 0;
    const abort = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      });
    });
  });
}
