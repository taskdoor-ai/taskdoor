export const localAgentIds = ["ChatGPT", "Claude Code", "WorkBuddy", "Cursor"] as const;
export type LocalAgentId = typeof localAgentIds[number];
export type LocalAgentProbe = { status: "available" | "missing" | "unsupported" | "error"; detail?: string };
export type LocalAgentCheck = { agent: LocalAgentId; checkedAt: string; desktop: LocalAgentProbe; cli: LocalAgentProbe };
export type AiHandoffFile = { name: string; mimeType: "text/html"; content: string };
export type PreparedAiHandoffFile = { name: string; mimeType: "text/html"; path: string; sizeBytes: number };
export const LOCAL_AGENT_HANDOFF_MAX_BYTES = 20 * 1024 * 1024;

/** Prepares a real local file; this is not proof that an AI client opened or read it. */
export async function prepareLocalAgentFile(file: AiHandoffFile, signal?: AbortSignal): Promise<PreparedAiHandoffFile> {
  const response = await fetch("/api/local-agents/handoff", {
    method: "POST", signal, cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Agentdoor-Local-Check": "1" }, body: JSON.stringify(file),
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("本地文件准备失败，请确认本机服务仍在运行后重试。");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("name" in result) || result.name !== file.name
    || !("mimeType" in result) || result.mimeType !== "text/html"
    || !("path" in result) || typeof result.path !== "string" || !/^(?:\/|[A-Za-z]:[\\/])/.test(result.path) || /[\u0000-\u001f]/.test(result.path)
    || !("sizeBytes" in result) || result.sizeBytes !== new TextEncoder().encode(file.content).byteLength) throw new Error("本地文件准备结果无效，请重试。");
  return result as PreparedAiHandoffFile;
}

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
