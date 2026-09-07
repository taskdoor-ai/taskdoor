import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TaskCreationExistingTaskCard } from "../src/components/TaskCreationExistingTaskCard.tsx";
import { creatorCommerceTags } from "../src/data/creatorCommerceScenario.ts";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const baseTask = {
  dueAt: "9 月 1 日",
  goal: "汇总关键决定、未解决问题与下周行动项。",
  iconName: "clipboard-check" as const,
  iconTone: "blue" as const,
  id: "weekly-retro-notes",
  labels: ["内容制作"],
  name: "整理本周团队复盘纪要",
  ownerId: "周岚",
  status: "进行中",
};

test("相似任务卡完整呈现已有任务快照且保持只读", () => {
  const html = renderToStaticMarkup(createElement(TaskCreationExistingTaskCard, {
    kind: "similar",
    reason: "两项任务都需要汇总复盘结果与后续行动。",
    tags: creatorCommerceTags,
    task: baseTask,
  }));

  for (const copy of ["相似任务", "只读", "整理本周团队复盘纪要", "进行中", "周岚", "9 月 1 日", "内容制作", "汇总关键决定", "复盘结果与后续行动"]) {
    assert.match(html, new RegExp(copy));
  }
  assert.doesNotMatch(html, /<(?:button|a)\b/);
});

test("任务标签与状态负责人日期合并在同一信息行", () => {
  const source = readFileSync(new URL("../src/components/TaskCreationExistingTaskCard.tsx", import.meta.url), "utf8");
  assert.match(source, /<div aria-label="已有任务信息" className="task-creation-existing-task-meta">[\s\S]*?<span aria-label="任务标签" className="task-creation-existing-task-tags">[\s\S]*?<\/span>[\s\S]*?<\/div>/);
});

test("相似任务与主任务均先展示负责人再展示状态，并复用详情字段标题", () => {
  for (const kind of ["similar", "parent"] as const) {
    for (const status of ["进行中", "等待外部确认"]) {
      const html = renderToStaticMarkup(createElement(TaskCreationExistingTaskCard, {
        kind, ownerName: "周岚", reason: "核对任务关系", tags: creatorCommerceTags,
        task: { ...baseTask, status },
      }));
      const ownerLabel = html.indexOf("<small>负责人</small>");
      const statusLabel = html.indexOf("<small>状态</small>");
      assert.ok(ownerLabel >= 0, "显示负责人标题");
      assert.ok(statusLabel > ownerLabel, "状态排在负责人之后");
      assert.ok(html.indexOf(status, statusLabel) > statusLabel, "状态值位于标题之后");
      assert.ok(html.indexOf(baseTask.dueAt) > statusLabel, "日期保持在状态之后");
      assert.match(html, /class="task-detail-property[^\"]*"[^>]*><small>负责人<\/small>/);
      assert.match(html, /class="task-detail-property[^\"]*"[^>]*><small>状态<\/small>/);
      assert.doesNotMatch(html, /<(?:button|a)\b/);
    }
  }
});

test("缺少负责人或状态时不显示空字段标题，也不补造数据", () => {
  const html = renderToStaticMarkup(createElement(TaskCreationExistingTaskCard, {
    kind: "similar", reason: "核对任务关系", tags: [],
    task: { ...baseTask, ownerId: undefined, status: undefined },
  }));
  assert.doesNotMatch(html, /<small>(?:负责人|状态)<\/small>|undefined|null/);
});

test("主任务卡使用主任务名称并显示已有子任务", () => {
  const html = renderToStaticMarkup(createElement(TaskCreationExistingTaskCard, {
    kind: "parent",
    reason: "媒体邀请尚未被现有子任务覆盖。",
    tags: creatorCommerceTags,
    task: {
      ...baseTask,
      childTaskNames: ["场地确认", "发布会流程设计", "宣传物料制作"],
      id: "product-launch-planning",
      name: "新品发布会筹备",
    },
  }));

  for (const copy of ["主任务", "已有 3 个子任务", "场地确认", "发布会流程设计", "宣传物料制作"]) {
    assert.match(html, new RegExp(copy));
  }
  assert.doesNotMatch(html, /可关联的父任务/);
  assert.doesNotMatch(html, /undefined|null/);
});
