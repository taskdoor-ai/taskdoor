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


test("任务编号作为 AI 上下文门牌号，注册仍使用内部任务身份", async () => {
  const { buildContextPrompt, copyAndOpenAiContext } = await import("../src/features/ai-connection/components/AiConnectionDialog.tsx");
  const { buildBusinessContextPrompt } = await import("../src/features/ai-connection/lib/business-connection.ts");
  const request = {
    taskId: "internal-task-uuid", taskNumber: 51, title: "连接 AI", description: "",
    context: [{ label: "任务编号", value: "51" }],
    workObject: { kind: "任务", title: "核对发布" },
    businessConnection: { sourceType: "TASK" as const, accountId: "user", teamId: "team" },
  };
  for (const locale of ["zh-CN", "en"] as const) {
    const snapshot = buildContextPrompt(request, locale);
    assert.match(snapshot, locale === "en" ? /Task number: 51/ : /任务编号：51/);
    assert.doesNotMatch(snapshot, /internal-task-uuid|任务 ID|Task ID/);
    const prompt = buildBusinessContextPrompt({ ...request.businessConnection, taskId: request.taskId, taskNumber: 51, snapshot, selectedTool: "copy" }, locale);
    assert.doesNotMatch(prompt, /internal-task-uuid|任务 ID|Task ID/);
  }
  let registrations = 0;
  const result = await copyAndOpenAiContext(request, null, {
    copyText: async () => true, openUrl: () => assert.fail("仅复制不打开"),
    registerConnection: async input => {
      registrations++;
      assert.equal(input.taskId, "internal-task-uuid");
      assert.match(input.payload.prompt, /任务编号：51/);
      assert.doesNotMatch(input.payload.prompt, /internal-task-uuid/);
      return { connectionId: "aic_test", createdAt: new Date().toISOString(), url: "http://localhost/context", statusUrl: "http://localhost/status" };
    },
  });
  assert.equal(result.status, "copied");
  assert.equal(registrations, 1);
});
