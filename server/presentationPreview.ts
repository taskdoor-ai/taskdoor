import { formatFileSize } from "../src/shared/lib/file-size";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { homedir, tmpdir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import { strFromU8, unzipSync } from "fflate";
import type { Plugin } from "vite";

export const PRESENTATION_PREVIEW_MAX_BYTES = 20 * 1024 * 1024;
const MAX_PDF_BYTES = 80 * 1024 * 1024;
const MAX_CONCURRENT = 2;
// Cold LibreOffice startup can exceed 45s while the local demo is building.
const CONVERSION_TIMEOUT_MS = 120_000;
type PresentationFormat = "ppt" | "pptx";

class PreviewError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
const cancelled = () => new PreviewError(499, "cancelled", "已取消演示文稿预览。");

export async function findPresentationConverter(env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
  const explicit = env.TASKDOOR_SOFFICE_PATH;
  const candidates = explicit ? [explicit] : [
    join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice"),
    ...(env.PATH ?? "").split(delimiter).filter(isAbsolute).flatMap(directory => [join(directory, "soffice"), join(directory, "libreoffice")]),
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    join(homedir(), "Applications/LibreOffice.app/Contents/MacOS/soffice"),
    "/opt/homebrew/bin/soffice", "/usr/local/bin/soffice", "/usr/bin/soffice",
    ...(env.ProgramFiles ? [join(env.ProgramFiles, "LibreOffice/program/soffice.exe")] : []),
  ];
  for (const candidate of new Set(candidates)) {
    if (!isAbsolute(candidate)) continue;
    try { if (!(await stat(candidate)).isFile()) continue; await access(candidate, constants.X_OK); return candidate; }
    catch { /* Continue to a local executable; never download a converter. */ }
  }
  return null;
}

type ConversionRuntime = {
  findExecutable: () => Promise<string | null>;
  run: (file: string, args: string[], signal: AbortSignal, environment?: NodeJS.ProcessEnv) => Promise<void>;
};
export function runPresentationConverter(file: string, args: string[], signal: AbortSignal, timeoutMs = CONVERSION_TIMEOUT_MS, environment?: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const abortError = () => Object.assign(new Error("Presentation conversion cancelled"), { name: "AbortError" });
    if (signal.aborted) return reject(abortError());
    // The bundled macOS converter may encounter linked images in a deck. Deny
    // network access for its entire process tree, rather than fetching them.
    const sandboxed = process.platform === "darwin";
    const grouped = process.platform !== "win32";
    let stopped: Error | undefined;
    let settled = false;
    const terminate = () => {
      if (!child.pid) return;
      try {
        // LibreOffice and its launcher can fork. The group belongs exclusively
        // to this job, so cancellation never targets an existing Office app.
        if (grouped) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") child.kill("SIGKILL");
      }
    };
    const stop = (error: Error) => { stopped ??= error; terminate(); };
    const abort = () => stop(abortError());
    const child = spawn(sandboxed ? "/usr/bin/sandbox-exec" : file,
      sandboxed ? ["-p", "(version 1)(allow default)(deny network*)", file, ...args] : args,
      { detached: grouped, stdio: "ignore", windowsHide: true, env: environment ? { ...process.env, ...environment } : process.env });
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (stopped || error) terminate();
      if (stopped) reject(stopped);
      else if (error) reject(error);
      else resolve();
    };
    child.once("error", finish);
    child.once("close", (code, exitSignal) => finish(code === 0 ? undefined : Object.assign(new Error("Presentation converter failed"), { code, signal: exitSignal })));
    const timer = setTimeout(() => stop(Object.assign(new Error("Presentation conversion timed out"), { code: "ETIMEDOUT", killed: true })), timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}

const runtime: ConversionRuntime = {
  findExecutable: findPresentationConverter,
  run: (file, args, signal, environment) => runPresentationConverter(file, args, signal, undefined, environment),
};

function validatePresentation(bytes: Buffer, format: PresentationFormat) {
  if (!bytes.length) throw new PreviewError(400, "empty_file", "演示文稿为空，请重新选择文件。");
  if (bytes.length > PRESENTATION_PREVIEW_MAX_BYTES) throw new PreviewError(413, "file_too_large", `演示文稿超过 ${formatFileSize(PRESENTATION_PREVIEW_MAX_BYTES, { fractionDigits: 2 })}，请缩小文件后重试。`);
  if (format === "ppt") {
    if (!bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
      throw new PreviewError(422, "invalid_presentation", "无法读取此PPT文件，请确认文件未损坏。");
    }
    return;
  }
  try {
    const parts = unzipSync(bytes, { filter: entry => ["[Content_Types].xml", "ppt/presentation.xml"].includes(entry.name) && entry.originalSize <= 2 * 1024 * 1024 });
    if (!parts["ppt/presentation.xml"]?.length || !parts["[Content_Types].xml"]?.length
      || !strFromU8(parts["[Content_Types].xml"]).includes("application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml")) throw new Error("invalid package");
  } catch { throw new PreviewError(422, "invalid_presentation", "无法读取此PPTX文件，请确认文件格式及内容完整。"); }
}

/** Produces a derived PDF only; the caller retains the original file/version. */
export async function convertPresentationToPdf(bytes: Buffer, format: PresentationFormat, signal: AbortSignal = new AbortController().signal, io: ConversionRuntime = runtime): Promise<Buffer> {
  validatePresentation(bytes, format);
  if (signal.aborted) throw cancelled();
  const executable = await io.findExecutable();
  if (!executable) throw new PreviewError(503, "converter_unavailable", "当前设备的演示文稿预览工具不可用，请稍后重试或下载原文件。");
  const directory = await mkdtemp(join(tmpdir(), "taskdoor-presentation-"));
  try {
    const input = join(directory, "input");
    const output = join(directory, "output");
    const profile = join(directory, "profile");
    await Promise.all([mkdir(input), mkdir(output), mkdir(join(profile, "user"), { recursive: true })]);
    await writeFile(join(profile, "user/registrymodifications.xcu"), `<?xml version="1.0" encoding="UTF-8"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop><prop oor:name="DisableActiveContent" oor:op="fuse"><value>true</value></prop></item></oor:items>`);
    let fontEnvironment: NodeJS.ProcessEnv | undefined;
    if (process.platform === "darwin") {
      // The headless macOS bundle can find its bundled Latin fonts while
      // missing the system fontconfig file. Explicit system directories keep
      // Chinese glyphs and PDF Unicode mappings without altering the deck.
      const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      const fontConfig = join(profile, "fonts.conf");
      const directories = ["/System/Library/Fonts", "/Library/Fonts", join(homedir(), "Library/Fonts")];
      await writeFile(fontConfig, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig>${directories.map(path => `<dir>${xml(path)}</dir>`).join("")}<cachedir>${xml(join(profile, "font-cache"))}</cachedir></fontconfig>`);
      fontEnvironment = { FONTCONFIG_FILE: fontConfig, SAL_FONTPATH: "/System/Library/Fonts/Supplemental" };
    }
    const source = join(input, `source.${format}`);
    await writeFile(source, bytes);
    if (signal.aborted) throw cancelled();
    try {
      await io.run(executable, [`-env:UserInstallation=${pathToFileURL(profile).href}`, "--headless", "--invisible", "--nologo", "--nodefault", "--norestore", "--nolockcheck", "--convert-to", "pdf:impress_pdf_Export", "--outdir", output, source], signal, fontEnvironment);
    } catch (error) {
      if (signal.aborted) throw cancelled();
      const cause = error as { killed?: boolean; code?: string; signal?: string };
      if (cause.killed || cause.code === "ETIMEDOUT" || cause.signal === "SIGKILL") throw new PreviewError(504, "conversion_timeout", "演示文稿转换超时，请重试或下载原文件。");
      throw new PreviewError(422, "conversion_failed", "演示文稿暂时无法转换，请确认文件未加密或损坏后重试。");
    }
    if (signal.aborted) throw cancelled();
    const target = join(output, "source.pdf");
    let pdf: Buffer;
    try {
      const metadata = await stat(target);
      if (!metadata.isFile() || metadata.size > MAX_PDF_BYTES || metadata.size < 8) throw new Error("invalid result");
      pdf = await readFile(target);
    } catch { throw new PreviewError(422, "invalid_conversion", "未能生成有效的演示文稿预览，请重试或下载原文件。"); }
    if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new PreviewError(422, "invalid_conversion", "演示文稿转换结果无效，请重试或下载原文件。");
    return pdf;
  } finally { await rm(directory, { recursive: true, force: true }); }
}

function readBody(req: IncomingMessage, signal: AbortSignal): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const cleanup = () => { clearTimeout(timer); req.off("data", data); req.off("end", end); req.off("error", failed); req.off("aborted", aborted); signal.removeEventListener("abort", aborted); };
    const fail = (error: Error) => { cleanup(); req.resume(); reject(error); };
    const data = (chunk: Buffer | string) => {
      const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += part.length;
      if (size > PRESENTATION_PREVIEW_MAX_BYTES) return fail(new PreviewError(413, "file_too_large", `演示文稿超过 ${formatFileSize(PRESENTATION_PREVIEW_MAX_BYTES, { fractionDigits: 2 })}，请缩小文件后重试。`));
      chunks.push(part);
    };
    const end = () => { cleanup(); resolve(Buffer.concat(chunks)); };
    const failed = () => fail(new PreviewError(400, "incomplete_body", "文件传输未完成，请重新选择后重试。"));
    const aborted = () => fail(cancelled());
    const timer = setTimeout(() => fail(new PreviewError(408, "upload_timeout", "文件读取超时，请重新选择后重试。")), 30_000);
    req.on("data", data); req.once("end", end); req.once("error", failed); req.once("aborted", aborted); signal.addEventListener("abort", aborted, { once: true });
    if (req.aborted || signal.aborted) aborted();
  });
}

function sendError(res: ServerResponse, error: PreviewError) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(error.status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...(error.status === 405 ? { Allow: "POST" } : {}) });
  res.end(JSON.stringify({ error: error.message, code: error.code }));
}

export function createPresentationPreviewMiddleware(convert: typeof convertPresentationToPdf = convertPresentationToPdf) {
  let pending = 0;
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/task-files/presentation-preview") return next();
    const host = req.headers.host ?? "";
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "")
      || !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host)
      || req.headers["sec-fetch-site"] === "cross-site"
      || req.headers.origin && ![`http://${host}`, `https://${host}`].includes(req.headers.origin)
      || req.headers["x-taskdoor-presentation-preview"] !== "1") return sendError(res, new PreviewError(403, "local_only", "仅允许本机同源预览演示文稿。"));
    if (req.method !== "POST") return sendError(res, new PreviewError(405, "method_not_allowed", "演示文稿预览仅支持POST。"));
    const format = url.searchParams.get("format");
    if (url.searchParams.getAll("format").length !== 1 || format !== "ppt" && format !== "pptx") return sendError(res, new PreviewError(400, "unsupported_format", "仅支持PPT和PPTX演示文稿。"));
    const contentType = req.headers["content-type"]?.split(";")[0].trim().toLowerCase();
    if (!["application/octet-stream", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"].includes(contentType ?? "")) return sendError(res, new PreviewError(415, "unsupported_content_type", "需要演示文稿原文件，请重新选择文件。"));
    const contentLength = req.headers["content-length"];
    if (contentLength && Number(contentLength) > PRESENTATION_PREVIEW_MAX_BYTES) return sendError(res, new PreviewError(413, "file_too_large", `演示文稿超过 ${formatFileSize(PRESENTATION_PREVIEW_MAX_BYTES, { fractionDigits: 2 })}，请缩小文件后重试。`));
    if (pending >= MAX_CONCURRENT) return sendError(res, new PreviewError(429, "converter_busy", "正在预览其他演示文稿，请稍后重试。"));
    pending++;
    const controller = new AbortController();
    const abort = () => controller.abort();
    const close = () => { if (!res.writableEnded) abort(); };
    req.once("aborted", abort); res.once("close", close);
    try {
      const bytes = await readBody(req, controller.signal);
      validatePresentation(bytes, format);
      const pdf = await convert(bytes, format, controller.signal);
      if (!controller.signal.aborted && !res.destroyed) {
        res.writeHead(200, { "Content-Type": "application/pdf", "Content-Length": pdf.length, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
        res.end(pdf);
      }
    } catch (error) {
      if (!controller.signal.aborted) sendError(res, error instanceof PreviewError ? error : new PreviewError(500, "preview_failed", "演示文稿预览失败，请重试或下载原文件。"));
    } finally { pending--; req.off("aborted", abort); res.off("close", close); }
  };
}

export function presentationPreviewPlugin(): Plugin {
  const middleware = createPresentationPreviewMiddleware();
  return { name: "taskdoor-presentation-preview", configureServer(server) { server.middlewares.use(middleware); }, configurePreviewServer(server) { server.middlewares.use(middleware); } };
}
