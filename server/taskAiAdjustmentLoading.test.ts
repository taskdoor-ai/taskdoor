import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getTaskAiAdjustmentSteps } from "../src/lib/taskAiAdjustmentProgress.ts";
import type { TaskAiAdjustmentProposal } from "../src/lib/taskAiAdjustmentTypes.ts";

const source = () => readFileSync(new URL("../src/components/TaskAiAdjustmentPopover.tsx", import.meta.url), "utf8");
const section = (start: string, end: string) => {
  const text = source();
  const from = text.indexOf(start);
  assert.ok(from >= 0, `缺少 ${start}`);
  const to = text.indexOf(end, from);
  assert.ok(to > from, `缺少 ${end}`);
  return text.slice(from, to);
};

test("AI调整在原输入框下复用两段轻量处理反馈，不创建四阶段日志", () => {
  const text = source();
  assert.match(text, /import \{ TaskAiWorking \} from "\.\/TaskAiWorking"/);
  assert.match(text, /import \{ playMockAiSteps \} from "\.\.\/lib\/taskAiFeedback"/);
  assert.match(text, /理解调整要求/);
  assert.match(text, /整理修改预览/);
  assert.match(text, /playMockAiSteps\(2,/);
  assert.match(text, /cancelLabel="停止预览调整"/);
  assert.doesNotMatch(text, /task-ai-adjust-mock">Mock/);
  assert.doesNotMatch(text, /TaskCreationProgress|role="log"|fetch\(/);
});

test("预览同步锁定运行，避免重复提交并只计算一次旧上下文候选", () => {
  const preview = section("const preview = async", "const apply = async");
  assert.match(preview, /if \(applying\.current \|\| previewController\.current \|\| !open \|\| !instruction\.trim\(\)\) return/);
  assert.ok(preview.indexOf("previewController.current = controller") < preview.indexOf("buildTaskAiAdjustment"));
  assert.ok(preview.indexOf("setPreviewing({ key: draftKey, step: 0 })") < preview.indexOf("buildTaskAiAdjustment"));
  assert.equal(preview.match(/buildTaskAiAdjustment\(/g)?.length, 1);
  assert.ok(preview.indexOf("buildTaskAiAdjustment") < preview.indexOf("await playMockAiSteps"));
  assert.ok(preview.indexOf("updateDraft({ proposal: result.proposal, progressId: progress.id })") > preview.indexOf("await playMockAiSteps"));
});

test("旧run必须同时通过运行号、范围、打开状态和取消信号检查才能回写", () => {
  const preview = section("const preview = async", "const apply = async");
  assert.match(preview, /run === previewRun\.current/);
  assert.match(preview, /!controller\.signal\.aborted/);
  assert.match(preview, /latestPreview\.current\.open/);
  assert.match(preview, /latestPreview\.current\.draftKey === draftKey/);
  assert.match(preview, /if \(!completed \|\| !isCurrent\(\)\) return/);
  assert.match(preview, /onStep: step => \{\s*if \(!isCurrent\(\)\) return;\s*setPreviewing/);
  assert.match(preview, /if \(previewRun\.current === run\)/);
});

test("关闭和切换范围的effect清理取消旧计时，卸载后也不回写", () => {
  const text = source();
  assert.match(text, /useEffect\(\(\) => \{[\s\S]*?return \(\) => \{[\s\S]*?previewRun\.current \+= 1;[\s\S]*?previewController\.current\?\.abort\(\);[\s\S]*?\}, \[open, draftKey\]\)/);
  assert.match(text, /latestPreview\.current = \{ draftKey, open, contextSignature \}/);
  const dismiss = section("const dismiss =", "const cancel =");
  assert.match(dismiss, /invalidatePreview\(\)/);
  const popoverEvents = text.slice(text.indexOf("return <Popover"), text.indexOf("<PopoverContent"));
  assert.match(popoverEvents, /if \(!value\) invalidatePreview\(\)/);
});

test("停止和收起只取消计算保留输入，不走丢弃当前草稿逻辑", () => {
  const stop = section("const stopPreview =", "const changeInstruction =");
  assert.match(stop, /invalidatePreview\(\)/);
  assert.match(stop, /输入已保留/);
  assert.doesNotMatch(stop, /discard|instruction:|proposal:/);
  const dismiss = section("const dismiss =", "const cancel =");
  assert.doesNotMatch(dismiss, /discard|updateDraft/);
  assert.match(source(), /onCancel=\{stopPreview\}/);
});

test("创建态复用新建任务输入框，处理中切换同一发送按钮为停止", () => {
  const text = source();
  const textarea = text.split("\n").find(line => line.includes("<Textarea")) ?? "";
  assert.match(text, /import \{ AnimatedAgentChatInput \} from "\.\/AnimatedAgentChatInput"/);
  assert.match(text, /<AnimatedAgentChatInput[\s\S]*?allowAttachments=\{false\}[\s\S]*?clearOnSend=\{false\}[\s\S]*?onChange=\{changeInstruction\}[\s\S]*?onSend=\{\(\) => \{ void preview\(\); \}\}[\s\S]*?onStop=\{stopPreview\}[\s\S]*?status=\{isPreviewing \? "analyzing" : "ready"\}[\s\S]*?value=\{instruction\}/);
  assert.match(text, /hint="Enter 发送 · Shift \+ Enter 换行"/);
  assert.match(textarea, /disabled=\{saving \|\| isPreviewing\}/);
  assert.match(textarea, /value=\{instruction\}/);
  assert.doesNotMatch(text, /aria-label="快捷调整"|task-ai-adjust-presets|task-ai-adjust-examples/);
  assert.doesNotMatch(text, /调整任务名称|补充完成标准|补充一个子任务|调整某项预计投入/);
  assert.match(text, /!isPreviewing && proposal && <section/);
  assert.match(text, /!isPreviewing && proposal && <footer/);
  assert.match(text, /!isPreviewing && !proposal && instruction/);
  assert.doesNotMatch(text, /回复生成中，进度显示在上方/);
  assert.match(text, /actionRef=\{stopButtonRef\}/);
  assert.match(text, /if \(!compact \|\| !isPreviewing\) return;[\s\S]*?stopButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(text, /<TaskAiWorking/);
});

test("上下文在反馈期间变化时拒绝旧预览，不借新上下文重新解释旧指令", () => {
  const preview = section("const preview = async", "const apply = async");
  assert.match(preview, /latestPreview\.current\.contextSignature !== contextSignature/);
  assert.match(preview, /任务内容或成员信息已变化/);
  assert.ok(preview.indexOf("contextSignature !== contextSignature") < preview.indexOf("updateDraft({ proposal: result.proposal, progressId: progress.id })"));
  assert.doesNotMatch(preview, /buildTaskAiAdjustment\(latestPreview/);
  assert.match(source(), /proposal\.baseSignature !== contextSignature/);
});

test("构建错误和没有变化先跨可取消的可见帧再结束，实际保存不增加演示等待", () => {
  const preview = section("const preview = async", "const apply = async");
  assert.match(preview, /if \("error" in result\) \{[\s\S]*?await waitForPreviewPaint\(controller\.signal\)[\s\S]*?if \(!painted \|\| !isCurrent\(\)\) return;[\s\S]*?finishProgress\("failed", result\.error/);
  assert.match(preview, /if \(!result\.proposal\.changes\.length\) \{[\s\S]*?await waitForPreviewPaint\(controller\.signal\)[\s\S]*?if \(!painted \|\| !isCurrent\(\)\) return;[\s\S]*?setNotice\(result\.proposal\.summary\);[\s\S]*?status: "completed"[\s\S]*?applicationStatus: "no_change"[\s\S]*?return;/);
  const paint = source().slice(source().indexOf("const waitForPreviewPaint"), source().indexOf("export function TaskAiAdjustButton"));
  assert.equal((paint.match(/Frame = window\.requestAnimationFrame/g) ?? []).length, 2);
  assert.match(paint, /signal\.addEventListener\("abort", cancel/);
  const apply = section("const apply = async", "const dismiss =");
  assert.match(apply, /await onApply\(proposal\)/);
  assert.doesNotMatch(apply, /playMockAiSteps|setTimeout/);
});

test("loading只在组件局部保存，不进入按范围缓存的AI草稿", () => {
  const text = source();
  assert.match(text, /const \[previewing, setPreviewing\] = useState/);
  assert.doesNotMatch(text, /updateDraft\(\{[^}]*previewing|updateDraft\(\{[^}]*previewStep/);
  assert.match(section("const changeInstruction =", "const preview ="), /if \(applying\.current \|\| previewController\.current\) return/);
});

test("预览阶段把固定输入区标记为busy，历史区仍独立播报思考进度", () => {
  const form = source().split("\n").find(line => line.includes("<form ")) ?? "";
  assert.ok(form.includes("aria-busy={saving || isPreviewing}"), "继续对话进入思考时，输入区应反映不可重复提交状态");
  assert.match(source(), /<TaskCreationHistory hideLatestPendingChanges onStopLatest=\{isPreviewing \? stopPreview : undefined\} processes=\{history\}/, "实时播报和停止动作保留在独立历史区");
});

test("步骤依据只展示本次原文和真实字段差异，不构造隐藏推理或工具执行", () => {
  const instruction = "任务名称改为新版发布计划";
  const initial = getTaskAiAdjustmentSteps(instruction);
  assert.equal(initial[0].basis, `本次要求：${instruction}`);
  assert.equal(initial[1].basis, "尚未生成修改候选。");
  const candidate: TaskAiAdjustmentProposal = {
    baseSignature: "snapshot", instruction, scope: { kind: "task" },
    updates: [{ taskId: "main", patch: { title: "新版发布计划" } }], additions: [],
    changes: [{ taskId: "main", taskTitle: "发布计划", label: "任务名称", before: "发布计划", after: "新版发布计划" }], summary: "仅修改已列出的字段",
  };
  const steps = getTaskAiAdjustmentSteps(instruction, candidate);
  assert.match(steps[0].basis, /候选涉及：发布计划/);
  assert.equal(steps[1].basis, "「发布计划」任务名称：发布计划 → 新版发布计划");
  assert.equal(steps[1].detail, "1 处字段变化，确认后才应用");
  assert.equal(candidate.changes.length, 1);
  assert.doesNotMatch(steps.map(step => step.basis).join(""), /已调用|工具|模型|推理链/);
});

test("外部生成过程与浮层共用一个时钟，关闭卸载和过期会同步终态", () => {
  const text = source();
  assert.equal((text.match(/await playMockAiSteps\(/g) ?? []).length, 1);
  assert.match(text, /onProgressChange\?: \(progress: TaskAiAdjustmentProgress, stop\?: \(\) => void\) => void/);
  assert.match(text, /finishProgress\("stopped", "预览已中止，输入已保留。", draftKey, true\)/);
  assert.match(text, /if \(stale && !applying\.current\) finishProgress\("completed"[\s\S]*?applicationStatus: "expired"/);
  assert.match(text, /<TaskCreationHistory hideLatestPendingChanges onStopLatest=\{isPreviewing \? stopPreview : undefined\} processes=\{history\}/);
  assert.match(text, /status=\{isPreviewing \? "analyzing" : "ready"\}/);
  assert.match(text, /progress\.status === "running" \? \(\) =>/);
  assert.match(text, /runningProgress\.current\.id === progress\.id/);
  assert.doesNotMatch(text, /setInterval\(|setTimeout\(/);
});
