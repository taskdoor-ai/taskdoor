import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LOCAL_AGENT_HANDOFF_MAX_BYTES, type AiHandoffFile, type PreparedAiHandoffFile } from "../src/features/ai-connection/lib/local-agent-connection";

export class LocalAgentHandoffInputError extends Error {}

function readHandoffFile(input: unknown): AiHandoffFile {
  const value = input as Partial<AiHandoffFile> | null;
  if (!value || typeof value !== "object" || Object.keys(value).some(key => !["name", "mimeType", "content"].includes(key))
    || typeof value.name !== "string" || !value.name.trim() || Buffer.byteLength(value.name) > 180
    || /[\\/:*?"<>|\u0000-\u001f]/.test(value.name) || value.name.startsWith(".") || !/\.html$/i.test(value.name)
    || value.mimeType !== "text/html" || typeof value.content !== "string" || !value.content.trim()
    || Buffer.byteLength(value.content) > LOCAL_AGENT_HANDOFF_MAX_BYTES) throw new LocalAgentHandoffInputError("需要有效且不超过20MiB的HTML标注文件。");
  return value as AiHandoffFile;
}

/** The caller supplies HTML bytes and a name, never an output path. No client is launched here. */
export async function prepareLocalAgentHandoff(input: unknown): Promise<PreparedAiHandoffFile> {
  const file = readHandoffFile(input);
  const directory = await mkdtemp(join(tmpdir(), "taskdoor-ai-handoff-"));
  const path = join(directory, file.name);
  try { await writeFile(path, file.content, { encoding: "utf8", mode: 0o600, flag: "wx" }); }
  catch (failure) { await rm(directory, { recursive: true, force: true }); throw failure; }
  return { name: file.name, mimeType: "text/html", path, sizeBytes: Buffer.byteLength(file.content) };
}
