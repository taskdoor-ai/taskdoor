import assert from "node:assert/strict";
import { readFile, rm, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import { createLocalAgentMiddleware } from "./localAgentConnection.ts";

const file = { name: "TaskDoor-标注.html", mimeType: "text/html", content: "<!doctype html><html><body><p>原文与标注</p><img src=\"data:image/png;base64,AA==\"></body></html>" };

const middleware = createLocalAgentMiddleware(async () => { assert.fail("准备文件不能检测或启动客户端"); });
async function post(input: unknown, requestOrigin = "http://127.0.0.1:5192", header = "1") {
  const req = Object.assign(Readable.from([Buffer.from(JSON.stringify(input))]), {
    method: "POST", url: "/api/local-agents/handoff", socket: { remoteAddress: "127.0.0.1" },
    headers: { host: "127.0.0.1:5192", origin: requestOrigin, "content-type": "application/json", "x-agentdoor-local-check": header },
  }) as unknown as IncomingMessage;
  let status = 0, body = "";
  const res = { writeHead(code: number) { status = code; }, end(value: string) { body = value; } } as unknown as ServerResponse;
  await middleware(req, res, () => { status = 404; body = "{}"; });
  return { status, json: () => JSON.parse(body) };
}

test("明确准备标注HTML时真实写入受控临时目录，返回相同字节与0600文件", async () => {
    const response = await post(file);
    assert.equal(response.status, 200);
    const prepared = await response.json();
    assert.equal(prepared.name, file.name);
    assert.equal(prepared.mimeType, "text/html");
    assert.equal(prepared.sizeBytes, Buffer.byteLength(file.content));
    assert.ok(prepared.path.startsWith(join(tmpdir(), "taskdoor-ai-handoff-")));
    assert.equal(await readFile(prepared.path, "utf8"), file.content);
    assert.equal((await stat(prepared.path)).mode & 0o777, 0o600);
    await rm(dirname(prepared.path), { recursive: true, force: true });
});

test("临时文件接口拒绝跨源、缺少本机请求头、任意路径和非HTML输入", async () => {
    assert.equal((await post(file, "https://example.com")).status, 403);
    assert.equal((await post(file, "http://127.0.0.1:5192", "")).status, 403);
    for (const input of [
      { ...file, name: "../标注.html" }, { ...file, name: "C:\\标注.html" },
      { ...file, name: "x".repeat(181) + ".html" }, { ...file, name: "bad\u0000.html" },
      { ...file, name: "标注.txt" }, { ...file, mimeType: "text/plain" }, { ...file, content: " " },
      { ...file, path: "/tmp/任意覆盖.html" },
    ]) assert.equal((await post(input)).status, 400);
});

test("临时HTML超出20MiB时拒绝准备，不返回可交接路径", async () => {
    const response = await post({ ...file, content: "x".repeat(20 * 1024 * 1024 + 1) });
    assert.equal(response.status, 400);
    assert.equal(Object.hasOwn(await response.json(), "path"), false);
});
