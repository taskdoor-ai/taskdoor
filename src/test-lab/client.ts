import type { McpDebugStatus,McpDebugCall,McpTool, LabBootstrap, LabRun, LabState, LabView, LabRunSelection, LabSkillVersion, SkillId, LabPreflight } from "./types";

export class LabApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = "LabApiError"; }
}

export function createLabClient(csrfToken = "", fetcher: typeof fetch = fetch) {
  async function request<T>(path: string, method = "GET", body?: unknown, signal?:AbortSignal): Promise<T> {
    const response = await fetcher(`/api/test-lab${path}`, {
      method, credentials: "same-origin", cache: "no-store", ...(signal?{signal}:{}),
      headers: method === "GET" ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json", "x-test-lab-csrf": csrfToken },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) throw new LabApiError(payload?.error || `请求失败（${response.status}）`, response.status);
    if (payload === null) throw new LabApiError("服务器没有返回有效 JSON，请检查测试服务是否启动。", response.status);
    return payload as T;
  }
  return {
    saveMcpToken:(token?:string,useDefault=false)=>request<McpDebugStatus>('/mcp/config','PUT',{token,useDefault}),
    mcpStatus:()=>request<McpDebugStatus>('/mcp'),
    mcpTools:()=>request<{tools:McpTool[];fetchedAt:string}>('/mcp/tools'),
    mcpCall:(requestId:string,name:string,args:Record<string,unknown>)=>request<McpDebugCall>('/mcp/call','POST',{requestId,name,arguments:args}),
    bootstrap: (query?:{batch?:string;result?:string}) => request<LabBootstrap>("/bootstrap"+(query?'?'+new URLSearchParams(query):'')),
    checkWorkflow: (workflowId:string) => request<LabPreflight>("/workflows/check", "POST", {workflowId}),
    saveState: (input: Pick<LabState, "teams" | "cases"> & { expectedRevision: number }) => request<LabState>("/state", "PUT", input),
    view: (teamId: string, actorId: string) => request<LabView>(`/view?${new URLSearchParams({ teamId, actorId })}`),
    run: async(caseIds: string[], requestId: string, selection?: LabRunSelection) => {
      const signal=AbortSignal.timeout(15000);
      try{return await request<LabRun[]>("/runs", "POST", {caseIds,requestId,selection},signal);}
      catch(error){
        if(!signal.aborted)throw error;
        // Recover the already accepted batch; never repeat the POST or model calls.
        try{const saved=await request<LabRun[]>(`/runs?${new URLSearchParams({requestId})}`,"GET",undefined,AbortSignal.timeout(5000));if(saved.length)return saved;}catch{}
        throw new LabApiError('提交响应超时，评测可能已保存；请到评测结果查看，勿重复创建。',408);
      }
    },
    skill: (id: SkillId) => request<{snapshot:string; hash:string}>(`/skills/${id}`),
    addSkillVersion: (expectedRevision:number, version:Pick<LabSkillVersion,"skillId"|"label"|"notes"|"snapshot"|"baseVersionId">) => request<LabState>("/skill-versions", "POST", {expectedRevision,version}),
    setSkillDefault: (expectedRevision:number,skillId:SkillId,versionId:string|null) => request<LabState>("/skill-default", "PUT", {expectedRevision,skillId,versionId}),
    saveCategory: (expectedRevision:number,category:{name:string;description:string;previousName?:string}) => request<LabState>("/categories", "PUT", {expectedRevision,category}),
    saveModels: (expectedRevision:number,models:string[],judgeEnabled?:boolean) => request<LabState>("/models", "PUT", {expectedRevision,models,...(judgeEnabled===undefined?{}:{judgeEnabled})}),
    modelCatalog: () => request<{models:string[]}>("/model-catalog"),
    cancel: (id: string) => request<LabRun>(`/runs/${encodeURIComponent(id)}/cancel`, "POST", {}),
    jevReview: (id:string) => request<LabRun>(`/runs/${encodeURIComponent(id)}/jev-review`, "POST", {}),
    review: (id: string, verdict: "passed" | "failed", note: string) => request<LabRun>(`/runs/${encodeURIComponent(id)}/review`, "POST", { verdict, note }),
    importLibrary: () => request<{ state: LabState; imported: number }>("/library/import", "POST", {}),
  };
}
