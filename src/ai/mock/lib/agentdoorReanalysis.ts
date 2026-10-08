type AgentdoorReanalysisOptions<T> = {
  analyze: () => T | Promise<T>;
  schedule?: (complete: () => void) => void;
};

const scheduleNextPaint = (complete: () => void) => {
  window.requestAnimationFrame(() => complete());
};

export async function runAgentdoorReanalysis<T>({
  analyze,
  schedule = scheduleNextPaint,
}: AgentdoorReanalysisOptions<T>): Promise<T> {
  await new Promise<void>((resolve) => schedule(resolve));
  return analyze();
}
