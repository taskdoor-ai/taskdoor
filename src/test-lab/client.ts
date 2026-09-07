import type { LabBootstrap, LabRun, LabState, LabView } from "./types";

export class LabApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "LabApiError"; }
}

export function createLabClient(csrfToken = "", fetcher: typeof fetch = fetch) {
  async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetcher(`/api/test-lab${path}`, {
      method, credentials: "same-origin", cache: "no-store",
      headers: method === "GET" ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json", "x-test-lab-csrf": csrfToken },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new LabApiError(payload?.error || `请求失败（${response.status}）`, response.status);
    if (payload === null) throw new LabApiError("服务器没有返回有效 JSON，请检查测试服务是否启动。", response.status);
    return payload as T;
  }
  return {
    bootstrap: () => request<LabBootstrap>("/bootstrap"),
    saveState: (input: Pick<LabState, "teams" | "cases"> & { expectedRevision: number }) => request<LabState>("/state", "PUT", input),
    view: (teamId: string, actorId: string) => request<LabView>(`/view?${new URLSearchParams({ teamId, actorId })}`),
    run: (caseIds: string[], requestId: string) => request<LabRun[]>("/runs", "POST", { caseIds, requestId }),
    cancel: (id: string) => request<LabRun>(`/runs/${encodeURIComponent(id)}/cancel`, "POST", {}),
    review: (id: string, verdict: "passed" | "failed", note: string) => request<LabRun>(`/runs/${encodeURIComponent(id)}/review`, "POST", { verdict, note }),
    importLibrary: () => request<{ state: LabState; imported: number }>("/library/import", "POST", {}),
  };
}
