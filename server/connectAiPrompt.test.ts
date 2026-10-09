import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register(`data:text/javascript,${encodeURIComponent(`
  export async function load(url, context, nextLoad) {
    if (url.endsWith(".svg")) return { format: "module", source: "export default " + JSON.stringify(url), shortCircuit: true };
    return nextLoad(url, context);
  }
`)}`, import.meta.url);

test("Connect AI copies the setup prompt, then opens the chosen client with it", async () => {
  const { copyAndOpenPrompt } = await import("../src/features/ai-connection/components/AiConnectionDialog.tsx");
  const { aiToolName, aiToolPromptLink } = await import("../src/features/ai-connection/lib/ai-tools.ts");
  assert.equal(aiToolName("ChatGPT"), "ChatGPT");
  assert.equal(aiToolName("Claude Code"), "Claude");
  assert.equal(aiToolPromptLink("Claude Code", "a b"), "claude://claude.ai/new?q=a%20b");
  assert.equal(aiToolPromptLink("ChatGPT", "a b"), "codex://new?prompt=a%20b");
  const opened: string[] = [];
  const copied: string[] = [];
  const ok = await copyAndOpenPrompt("install", "Cursor", { copyText: async (text) => { copied.push(text); return true; }, openUrl: (url) => { opened.push(url); } }, "en");
  assert.deepEqual(copied, ["install"]);
  assert.deepEqual(opened, ["cursor://anysphere.cursor-deeplink/prompt?text=install"]);
  assert.equal(ok.status, "open-attempted");
  assert.match(ok.message, /^Copied, and Cursor was asked to open/);
  const failed = await copyAndOpenPrompt("install", "Cursor", { copyText: async () => false, openUrl: () => { opened.push("x"); } });
  assert.equal(failed.status, "copy-failed");
  assert.equal(opened.length, 1);
  const blocked = await copyAndOpenPrompt("install", "WorkBuddy", { copyText: async () => true, openUrl: () => { throw new Error("blocked"); } });
  assert.equal(blocked.status, "open-failed");
  assert.match(blocked.message, /WorkBuddy/);
});
