import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { localAgentIds, type LocalAgentCheck, type LocalAgentId, type LocalAgentProbe } from "../src/lib/localAgentConnection";

const tools: Record<LocalAgentId, { scheme: string; command: string | null }> = {
  ChatGPT: { scheme: "codex", command: "codex" },
  "Claude Code": { scheme: "claude", command: "claude" },
  WorkBuddy: { scheme: "workbuddy", command: null },
  Cursor: { scheme: "cursor", command: "cursor" },
};
type ProbeRuntime = {
  platform: string;
  findExecutable: (command: string) => Promise<string | null>;
  run: (file: string, args: string[]) => Promise<string>;
};

async function findExecutable(command: string) {
  const dirs = new Set([...(process.env.PATH ?? "").split(delimiter), join(homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin"]);
  for (const dir of dirs) {
    if (!isAbsolute(dir)) continue;
    const file = join(dir, command);
    try { if (!(await stat(file)).isFile()) continue; await access(file, constants.X_OK); return file; } catch { /* Try the next executable directory. */ }
  }
  return null;
}
const runtime: ProbeRuntime = {
  platform: process.platform, findExecutable,
  run: (file, args) => new Promise((resolve, reject) => execFile(file, args, { timeout: 3_000, maxBuffer: 16_384, encoding: "utf8", windowsHide: true }, (error, stdout) => error ? reject(error) : resolve(stdout))),
};

export async function probeLocalAgent(agent: LocalAgentId, io = runtime): Promise<LocalAgentCheck> {
  const tool = tools[agent];
  const desktop = async (): Promise<LocalAgentProbe> => {
    if (io.platform !== "darwin") return { status: "unsupported", detail: "当前系统暂不支持检测桌面启动入口" };
    try {
      // Query Launch Services without opening any app or sending task content.
      const script = `ObjC.import('AppKit'); var app = $.NSWorkspace.sharedWorkspace.URLForApplicationToOpenURL($.NSURL.URLWithString('${tool.scheme}://')); !app.isNil();`;
      const output = (await io.run("/usr/bin/osascript", ["-l", "JavaScript", "-e", script])).trim();
      if (output !== "true" && output !== "false") return { status: "error", detail: "未能确认桌面启动入口" };
      return output === "true" ? { status: "available", detail: "系统已注册此工具的启动入口" } : { status: "missing", detail: "未检测到启动入口，请安装并打开一次客户端" };
    } catch { return { status: "error", detail: "启动入口检测失败，请重试" }; }
  };
  const cli = async (): Promise<LocalAgentProbe> => {
    if (!tool.command) return { status: "unsupported", detail: "此工具通过桌面客户端使用" };
    if (io.platform === "win32") return { status: "unsupported", detail: "当前系统暂不支持检测命令行" };
    try {
      const executable = await io.findExecutable(tool.command);
      if (!executable) return { status: "missing", detail: "未检测到 CLI；桌面客户端仍可独立使用" };
      const output = (await io.run(executable, ["--version"])).replace(/\x1b\[[0-9;]*m/g, "").trim();
      const version = output.split(/\r?\n/).find(line => /\d+\.\d+/.test(line));
      if (!version) return { status: "error", detail: "CLI 未返回有效版本，请检查安装" };
      return { status: "available", detail: version.slice(0, 120) };
    } catch { return { status: "error", detail: "CLI 未正常响应或检测超时，请重试" }; }
  };
  const [desktopResult, cliResult] = await Promise.all([desktop(), cli()]);
  return { agent, checkedAt: new Date().toISOString(), desktop: desktopResult, cli: cliResult };
}

const send = (res: ServerResponse, status: number, payload: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(payload));
};

export function createLocalAgentMiddleware(probe = probeLocalAgent) {
  const pending = new Map<LocalAgentId, Promise<LocalAgentCheck>>();
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split("?")[0] !== "/api/local-agents/check") return next();
    const host = req.headers.host ?? "";
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "")
      || !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host)
      || req.headers["sec-fetch-site"] === "cross-site"
      || req.headers.origin && req.headers.origin !== `http://${host}` && req.headers.origin !== `https://${host}`
      || req.headers["x-agentdoor-local-check"] !== "1") return send(res, 403, { error: "仅允许本机同源检测" });
    if (req.method !== "POST") return send(res, 405, { error: "仅支持 POST" });
    if (!req.headers["content-type"]?.startsWith("application/json")) return send(res, 400, { error: "需要 JSON 请求" });
    let agent: LocalAgentId;
    try {
      let body = "";
      for await (const chunk of req) { body += chunk.toString(); if (Buffer.byteLength(body) > 512) throw new Error("请求过大"); }
      const input = JSON.parse(body);
      if (!input || Object.keys(input).length !== 1 || !localAgentIds.includes(input.agent)) throw new Error("不支持的工具");
      agent = input.agent;
    } catch { return send(res, 400, { error: "需要有效的工具名称" }); }
    try {
      if (!pending.has(agent)) pending.set(agent, probe(agent).finally(() => pending.delete(agent)));
      send(res, 200, await pending.get(agent));
    } catch { send(res, 500, { error: "检测失败，请重试" }); }
  };
}

export function localAgentConnectionPlugin(): Plugin {
  const middleware = createLocalAgentMiddleware();
  return { name: "agentdoor-local-agent-check", configureServer(server) { server.middlewares.use(middleware); }, configurePreviewServer(server) { server.middlewares.use(middleware); } };
}
