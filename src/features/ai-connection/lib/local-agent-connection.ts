export const localAgentIds = ["ChatGPT", "Claude Code", "WorkBuddy", "Cursor"] as const;
export type LocalAgentId = typeof localAgentIds[number];
export type LocalAgentProbe = { status: "available" | "missing" | "unsupported" | "error"; detail?: string };
export type LocalAgentCheck = { agent: LocalAgentId; checkedAt: string; desktop: LocalAgentProbe; cli: LocalAgentProbe };

const validProbe = (value: unknown): value is LocalAgentProbe => Boolean(value && typeof value === "object"
  && "status" in value && ["available", "missing", "unsupported", "error"].includes(String(value.status))
  && (!("detail" in value) || typeof value.detail === "string"));

/** A response proves local tool readiness, never that an Agent accepted work. */
export async function checkLocalAgent(agent: LocalAgentId, signal?: AbortSignal): Promise<LocalAgentCheck> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 8_000);
  try {
    const response = await fetch("/api/local-agents/check", {
      method: "POST", signal: controller.signal, cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Agentdoor-Local-Check": "1" }, body: JSON.stringify({ agent }),
    });
    if (response.status === 403) throw new Error("仅支持在运行此项目的本机检测，请使用本机地址打开页面。");
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("本地检测服务不可用，请在本机启动项目后重试。");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("agent" in result) || result.agent !== agent
      || !("checkedAt" in result) || typeof result.checkedAt !== "string" || !Number.isFinite(Date.parse(result.checkedAt))
      || !("desktop" in result) || !validProbe(result.desktop) || !("cli" in result) || !validProbe(result.cli)) {
      throw new Error("检测结果无效，请重试。");
    }
    return result as LocalAgentCheck;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) throw new Error("检测超时，请稍后重试。");
    if (error instanceof TypeError) throw new Error("无法访问本地检测服务，请确认项目仍在运行。");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
