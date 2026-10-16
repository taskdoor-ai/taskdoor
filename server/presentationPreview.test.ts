import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { convertPresentationToPdf, createPresentationPreviewMiddleware, findPresentationConverter, PRESENTATION_PREVIEW_MAX_BYTES, runPresentationConverter } from "./presentationPreview.ts";

const pptx = Buffer.from(zipSync({
  "[Content_Types].xml": strToU8('<Types><Override ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>'),
  "ppt/presentation.xml": strToU8('<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>'),
}));
const ppt = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
const pdf = Buffer.from("%PDF-1.7\nconverter output fixture\n");
const headers = { "Content-Type": "application/octet-stream", "X-TaskDoor-Presentation-Preview": "1" };

async function serve(convert: Parameters<typeof createPresentationPreviewMiddleware>[0]) {
  const middleware = createPresentationPreviewMiddleware(convert);
  const server = createServer((req, res) => { void middleware(req, res, () => { res.writeHead(404); res.end(); }); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return { url: `http://127.0.0.1:${address.port}/api/task-files/presentation-preview`, close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }) };
}

test("演示预览接口只接受本机同源且显式标记的 PPT/PPTX 原字节", async () => {
  const formats: string[] = [];
  const server = await serve(async (_bytes, format) => { formats.push(format); return pdf; });
  try {
    for (const [format, body] of [["pptx", pptx], ["ppt", ppt]] as const) {
      const response = await fetch(`${server.url}?format=${format}`, { method: "POST", headers, body });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "application/pdf");
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
    }
    assert.deepEqual(formats, ["pptx", "ppt"]);
    assert.equal((await fetch(`${server.url}?format=pptx`, { method: "POST", body: pptx })).status, 403);
    assert.equal((await fetch(`${server.url}?format=pptx`, { method: "POST", headers: { ...headers, Origin: "https://other.example" }, body: pptx })).status, 403);
  } finally { await server.close(); }
});

test("输入格式、空正文、假扩展名与超过20MiB请求在转换前拒绝", async () => {
  let calls = 0;
  const server = await serve(async () => { calls++; return pdf; });
  try {
    assert.equal((await fetch(`${server.url}?format=docx`, { method: "POST", headers, body: pptx })).status, 400);
    assert.equal((await fetch(`${server.url}?format=pptx`, { method: "POST", headers, body: "" })).status, 400);
    assert.equal((await fetch(`${server.url}?format=pptx`, { method: "POST", headers, body: "not a presentation" })).status, 422);
    assert.equal((await fetch(`${server.url}?format=ppt`, { method: "POST", headers, body: pptx })).status, 422);
    assert.equal((await fetch(`${server.url}?format=pptx`, { method: "POST", headers, body: Buffer.alloc(PRESENTATION_PREVIEW_MAX_BYTES + 1) })).status, 413);
    const streamed: RequestInit & { duplex: "half" } = { method: "POST", headers, duplex: "half", body: new ReadableStream({ start(controller) {
      controller.enqueue(Buffer.alloc(PRESENTATION_PREVIEW_MAX_BYTES));
      controller.enqueue(Buffer.from([0]));
      controller.close();
    } }) };
    assert.equal((await fetch(`${server.url}?format=pptx`, streamed)).status, 413);
    assert.equal((await fetch(`${server.url}?format=pptx`, { headers })).status, 405);
    assert.equal((await fetch(`${server.url}?format=pptx`, { method: "POST", headers: { ...headers, "Content-Type": "application/pdf" }, body: pptx })).status, 415);
    assert.equal(calls, 0);
  } finally { await server.close(); }
});

test("两份演示转换期间第三个请求立即返回繁忙，完成后释放名额", async () => {
  const release: Array<() => void> = [];
  const server = await serve(async () => { await new Promise<void>(resolve => release.push(resolve)); return pdf; });
  try {
    const first = fetch(`${server.url}?format=pptx`, { method: "POST", headers, body: pptx });
    const second = fetch(`${server.url}?format=pptx`, { method: "POST", headers, body: pptx });
    while (release.length < 2) await new Promise(resolve => setTimeout(resolve, 5));
    const busy = await fetch(`${server.url}?format=pptx`, { method: "POST", headers, body: pptx });
    assert.equal(busy.status, 429);
    for (const done of release) done();
    assert.deepEqual((await Promise.all([first, second])).map(response => response.status), [200, 200]);
  } finally { for (const done of release) done(); await server.close(); }
});

test("转换使用独立文件和用户配置，成功与失败均清理自己的目录", async () => {
  const jobDirectories: string[] = [];
  const run = async (_file: string, args: string[]) => {
    const output = args[args.indexOf("--outdir") + 1];
    const source = args.at(-1)!;
    const job = join(output, "..");
    jobDirectories.push(job);
    assert.ok(source.endsWith("source.pptx"));
    assert.ok(args.some(argument => argument.startsWith("-env:UserInstallation=file:")));
    await access(source);
    await writeFile(join(output, "source.pdf"), pdf);
  };
  const io = { findExecutable: async () => "/local/soffice", run };
  const values = await Promise.all([convertPresentationToPdf(pptx, "pptx", undefined, io), convertPresentationToPdf(pptx, "pptx", undefined, io)]);
  assert.ok(values.every(value => value.equals(pdf)));
  assert.notEqual(jobDirectories[0], jobDirectories[1]);
  for (const directory of jobDirectories) await assert.rejects(access(directory));
  await assert.rejects(convertPresentationToPdf(pptx, "pptx", undefined, {
    ...io, run: async (_file, args) => { jobDirectories.push(join(args[args.indexOf("--outdir") + 1], "..")); throw new Error("private /machine/path/converter failed"); },
  }), error => error instanceof Error && !error.message.includes("/machine/path"));
  await assert.rejects(access(jobDirectories.at(-1)!));
});

test("非PDF转换结果与不存在的显式工具路径不冒充可用预览", async () => {
  assert.equal(await findPresentationConverter({ TASKDOOR_SOFFICE_PATH: "/does-not-exist/taskdoor/soffice" }), null);
  await assert.rejects(convertPresentationToPdf(pptx, "pptx", undefined, {
    findExecutable: async () => "/local/soffice",
    run: async (_file, args) => { await writeFile(join(args[args.indexOf("--outdir") + 1], "source.pdf"), "not a PDF"); },
  }), /预览|转换/);
  await assert.rejects(convertPresentationToPdf(pptx, "pptx", undefined, {
    findExecutable: async () => "/local/soffice",
    run: async () => { throw Object.assign(new Error("private machine timeout"), { killed: true }); },
  }), error => error instanceof Error && "status" in error && error.status === 504 && !error.message.includes("private"));
});

test("浏览器取消请求时中止转换，错误回应不泄漏本机路径", async () => {
  let notifyStarted!: () => void;
  const started = new Promise<void>(resolve => { notifyStarted = resolve; });
  let notifyAborted!: () => void;
  const aborted = new Promise<void>(resolve => { notifyAborted = resolve; });
  const server = await serve(async (_bytes, _format, signal) => {
    notifyStarted();
    await new Promise<void>((_resolve, reject) => signal!.addEventListener("abort", () => { notifyAborted(); reject(new Error("cancelled /private/path")); }, { once: true }));
    return pdf;
  });
  try {
    const controller = new AbortController();
    const request = fetch(`${server.url}?format=pptx`, { method: "POST", headers, body: pptx, signal: controller.signal });
    await started;
    controller.abort();
    await assert.rejects(request);
    await aborted;
  } finally { await server.close(); }
  const failure = await serve(async () => { throw new Error("converter /private/machine/file failed"); });
  try {
    const response = await fetch(`${failure.url}?format=pptx`, { method: "POST", headers, body: pptx });
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /private|machine/);
  } finally { await failure.close(); }
});

test("转换超时有明确错误，取消会终止自己的后代而保留其他进程", { skip: process.platform === "win32" }, async () => {
  await assert.rejects(runPresentationConverter(process.execPath, ["-e", "setInterval(() => {}, 1000)"], new AbortController().signal, 100),
    error => error instanceof Error && "code" in error && error.code === "ETIMEDOUT");
  const directory = await mkdtemp(join(tmpdir(), "taskdoor-converter-cancel-test-"));
  const pidFile = join(directory, "child.pid");
  const unrelated = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  const controller = new AbortController();
  const childCode = `require("node:fs").writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setInterval(() => {}, 1000);`;
  const parentCode = `require("node:child_process").spawn(process.execPath, ["-e", ${JSON.stringify(childCode)}], {stdio: "inherit"}); setInterval(() => {}, 1000);`;
  const running = runPresentationConverter(process.execPath, ["-e", parentCode], controller.signal, 60_000);
  // Attach the rejection handler before abort so it cannot become unhandled.
  const stopped = assert.rejects(running, error => error instanceof Error && error.name === "AbortError");
  let childPid: number | undefined;
  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try { childPid = Number(await readFile(pidFile, "utf8")); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 20)); }
    }
    assert.ok(childPid, "the converter's real child process must have started");
    controller.abort();
    await stopped;
    const deadlineAfterAbort = Date.now() + 5_000;
    let alive = true;
    while (Date.now() < deadlineAfterAbort) {
      try { process.kill(childPid, 0); }
      catch { alive = false; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(alive, false, "cancelled converter child must not remain running");
    assert.ok(unrelated.pid);
    assert.doesNotThrow(() => process.kill(unrelated.pid!, 0));
  } finally {
    controller.abort();
    await stopped;
    unrelated.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
  }
});

test("转换子进程收到本作业字体环境，同时保留系统PATH", async () => {
  const directory = await mkdtemp(join(tmpdir(), "taskdoor-converter-font-env-test-"));
  const result = join(directory, "environment.json");
  try {
    const code = `require("node:fs").writeFileSync(${JSON.stringify(result)}, JSON.stringify({font:process.env.FONTCONFIG_FILE,path:process.env.PATH}));`;
    await runPresentationConverter(process.execPath, ["-e", code], new AbortController().signal, 30_000, { FONTCONFIG_FILE: join(directory, "fonts.conf") });
    const values = JSON.parse(await readFile(result, "utf8"));
    assert.equal(values.font, join(directory, "fonts.conf"));
    assert.equal(values.path, process.env.PATH);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
