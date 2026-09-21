import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { probeLocalAgent, createLocalAgentMiddleware } from "./localAgentConnection.ts";

test("WorkBuddy 使用已注册的客户端协议，不猜测 CLI 命令", async () => {
  const commands: string[] = [];
  const result = await probeLocalAgent("WorkBuddy", {
    platform: "darwin",
    findExecutable: async () => { throw Error("should not query a WorkBuddy CLI"); },
    run: async (file, args) => { commands.push(`${file} ${args.join(" ")}`); return "true\n"; },
  });
  assert.equal(result.desktop.status, "available");
  assert.equal(result.cli.status, "unsupported");
  assert.equal(commands.length, 1);
  assert.match(commands[0], /workbuddy:\/\//);
  assert.doesNotMatch(commands[0], /codebuddy|--version/);
});

test("真实启动入口和 CLI 响应分开记录，不把安装当作 Agent 接单", async () => {
  const commands: string[] = [];
  const result = await probeLocalAgent("ChatGPT", {
    platform: "darwin",
    findExecutable: async command => command === "codex" ? "/tools/codex" : null,
    run: async (file, args) => {
      commands.push(`${file} ${args.join(" ")}`);
      return file === "/usr/bin/osascript" ? "true\n" : "codex-cli 1.0.0\n";
    },
  });
  assert.equal(result.desktop.status, "available");
  assert.equal(result.cli.status, "available");
  assert.equal(result.cli.detail, "codex-cli 1.0.0");
  assert.ok(commands.some(command => command === "/tools/codex --version"));
  assert.doesNotMatch(commands.join("\n"), /open -a|login|task|exec /);
  assert.equal("connected" in result, false);
});

test("工具缺失、检测不支持和响应失败不能报告为可用", async () => {
  const missing = await probeLocalAgent("Cursor", { platform: "darwin", findExecutable: async () => null, run: async () => "false\n" });
  assert.equal(missing.desktop.status, "missing");
  assert.equal(missing.cli.status, "missing");
  const failed = await probeLocalAgent("Claude Code", { platform: "linux", findExecutable: async () => "/tools/claude", run: async () => { throw new Error("timeout"); } });
  assert.equal(failed.desktop.status, "unsupported");
  assert.equal(failed.cli.status, "error");
});

test("检测接口只接受本机同源白名单工具，不接受任意命令或任务内容", async () => {
  const requests: string[] = [];
  const middleware = createLocalAgentMiddleware(async agent => {
    requests.push(agent);
    return { agent, checkedAt: new Date().toISOString(), desktop: { status: "available" }, cli: { status: "missing" } };
  });
  const server = createServer((req, res) => { void middleware(req, res, () => { res.writeHead(404); res.end(); }); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  const call = (body: unknown, requestOrigin = origin) => fetch(`${origin}/api/local-agents/check`, {
    method: "POST", headers: { Origin: requestOrigin, "Content-Type": "application/json", "X-Agentdoor-Local-Check": "1" }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await call({ agent: "ChatGPT" })).status, 200);
    assert.equal((await call({ agent: "ChatGPT" }, "https://example.com")).status, 403);
    assert.equal((await call({ agent: "sh; echo unsafe" })).status, 400);
    assert.equal((await call({ agent: "Cursor", command: "rm -rf /" })).status, 400);
    assert.deepEqual(requests, ["ChatGPT"]);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
