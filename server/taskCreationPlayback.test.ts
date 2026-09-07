import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { playMockAiSteps } from "../src/lib/taskAiFeedback.ts";
import * as creationProgress from "../src/lib/taskCreationProgress.ts";

test("Mock 演示按顺序展示阶段，最后一个阶段展示完才允许发布候选", async () => {
  const steps: number[] = [];
  const completed = await playMockAiSteps(4, {
    signal: new AbortController().signal, stepMs: 0, onStep: index => steps.push(index),
  });
  assert.equal(completed, true);
  assert.deepEqual(steps, [0, 1, 2, 3]);
});

test("创建四阶段各展示三秒，满十二秒后才发布候选", async t => {
  assert.equal(creationProgress.CREATION_MOCK_STEP_MS, 3000);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const steps: number[] = [];
  let published = "人工草稿";
  const pending = playMockAiSteps(4, {
    signal: new AbortController().signal, stepMs: creationProgress.CREATION_MOCK_STEP_MS,
    onStep: index => steps.push(index),
  }).then(completed => { if (completed) published = "候选方案"; return completed; });
  for (let index = 0; index < 4; index += 1) {
    assert.deepEqual(steps, Array.from({ length: index + 1 }, (_, step) => step));
    t.mock.timers.tick(creationProgress.CREATION_MOCK_STEP_MS - 1);
    await Promise.resolve();
    assert.equal(published, "人工草稿", "当前阶段不足三秒，不发布候选");
    assert.deepEqual(steps, Array.from({ length: index + 1 }, (_, step) => step));
    t.mock.timers.tick(1);
    await Promise.resolve();
  }
  assert.equal(await pending, true);
  assert.equal(published, "候选方案");
  assert.deepEqual(steps, [0, 1, 2, 3]);
});

test("四个阶段中的任意阶段停止，都不发布或继续播放", async t => {
  assert.equal(creationProgress.CREATION_MOCK_STEP_MS, 3000);
  for (let stopAt = 0; stopAt < 4; stopAt += 1) {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const controller = new AbortController();
    const steps: number[] = [];
    let published = "人工草稿";
    const pending = playMockAiSteps(4, {
      signal: controller.signal, stepMs: creationProgress.CREATION_MOCK_STEP_MS,
      onStep: index => steps.push(index),
    }).then(completed => { if (completed) published = "候选方案"; return completed; });
    for (let index = 0; index < stopAt; index += 1) {
      t.mock.timers.tick(creationProgress.CREATION_MOCK_STEP_MS);
      await Promise.resolve();
    }
    t.mock.timers.tick(creationProgress.CREATION_MOCK_STEP_MS / 2);
    await Promise.resolve();
    assert.equal(published, "人工草稿");
    controller.abort();
    assert.equal(await pending, false);
    t.mock.timers.tick(12_000);
    await Promise.resolve();
    assert.deepEqual(steps, Array.from({ length: stopAt + 1 }, (_, step) => step));
    assert.equal(published, "人工草稿");
    t.mock.timers.reset();
  }
});

test("其他调用方的共享播放器仍默认650毫秒，不随创建演示变慢", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let completed = false;
  const pending = playMockAiSteps(1, {
    signal: new AbortController().signal, onStep: () => {},
  }).then(result => { completed = result; });
  t.mock.timers.tick(649);
  await Promise.resolve();
  assert.equal(completed, false);
  t.mock.timers.tick(1);
  await pending;
  assert.equal(completed, true);
});

test("已取消的规划不产生阶段或可发布结果", async () => {
  const controller = new AbortController();
  controller.abort();
  const completed = await playMockAiSteps(2, {
    signal: controller.signal, stepMs: 0, onStep: () => assert.fail("不得显示已取消阶段"),
  });
  assert.equal(completed, false);
});

test("中途取消清理计时器，不再出现后续阶段", async () => {
  const controller = new AbortController();
  const steps: number[] = [];
  const completed = await playMockAiSteps(2, {
    signal: controller.signal, stepMs: 60_000,
    onStep: index => { steps.push(index); queueMicrotask(() => controller.abort()); },
  });
  assert.equal(completed, false);
  assert.deepEqual(steps, [0]);
});

test("取消旧一轮后新一轮可以完成，旧结果不覆盖新结果", async () => {
  const first = new AbortController();
  let published = "人工草稿";
  const oldRun = playMockAiSteps(2, {
    signal: first.signal, stepMs: 60_000, onStep: () => {},
  }).then(completed => { if (completed) published = "旧结果"; });
  first.abort();
  assert.equal(published, "人工草稿");
  const completed = await playMockAiSteps(2, {
    signal: new AbortController().signal, stepMs: 0, onStep: () => {},
  });
  if (completed) published = "新结果";
  await oldRun;
  assert.equal(published, "新结果");
});

test("创建页保留取消、卸载与重复提交保护，仅在演示完成后发布方案", () => {
  const page = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  assert.match(page, /planningAbort\.current \|\| busy/);
  assert.match(page, /planningAbort\.current\?\.abort\(\)/);
  assert.match(page, /if \(!completed \|\| run !== planningRun\.current\) return/);
  assert.match(page, /TaskCreationProcess/);
  assert.match(page, /updateProcess\(run, \{ status: "stopped"/);
  assert.doesNotMatch(page, /<AgentWorkflow|TaskCreationConversation/);
});

test("停止或同阶段失败后等待输入恢复可编辑再归还焦点，新一轮不会继承旧焦点请求", () => {
  const page = readFileSync(new URL("../src/components/TaskCreationPage.tsx", import.meta.url), "utf8");
  assert.match(page, /if \(busy \|\| !restorePlanningFocus\.current\) return/);
  assert.match(page, /requestAnimationFrame\(\(\) => \{\s*stageRef\.current\?\.querySelector<HTMLTextAreaElement>\("textarea:not\(:disabled\)"\)\?\.focus/);
  assert.match(page, /return \(\) => cancelAnimationFrame\(frame\)/);
  assert.match(page, /const stopPlanning = \(\) => \{[\s\S]*?restorePlanningFocus\.current = true;[\s\S]*?setBusy\(false\)/);
  assert.match(page, /if \(next\.stage === "unavailable"\) \{\s*restorePlanningFocus\.current = true/);
  assert.match(page, /planningAbort\.current = controller;\s*restorePlanningFocus\.current = false/);
});
