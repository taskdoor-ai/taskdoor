import assert from "node:assert/strict";
import test from "node:test";
import { getLinearCreationStages } from "../src/lib/taskCreationLinearStages.ts";
import type { CreationForm } from "../src/lib/taskCreationForm.ts";

const form = (subtaskCount: number): CreationForm => ({
  request: "推进新品发布",
  decision: "independent",
  mainTask: {
    clientId: "main",
    title: "新品发布",
    goal: "按期上线",
    ownerId: "",
    participantIds: [],
    labels: [],
    startDate: "",
    endDate: "",
    completionCriteria: ["完成上线"],
    executionTips: [],
    dependsOnClientIds: [],
  },
  subtasks: Array.from({ length: subtaskCount }, (_, index) => ({
    clientId: `sub-${index}`,
    title: `子任务 ${index + 1}`,
    goal: "按期上线",
    ownerId: "",
    participantIds: [],
    labels: [],
    startDate: "",
    endDate: "",
    completionCriteria: ["交付完成"],
    executionTips: [],
    dependsOnClientIds: index ? [`sub-${index - 1}`] : [],
  })),
});

test("无子任务时只显示目标、人员和拆分判断", () => {
  assert.deepEqual(getLinearCreationStages(form(0), 9).map(stage => stage.id), ["goal", "people", "split"]);
});

test("有子任务时先规划再逐项揭示", () => {
  assert.deepEqual(getLinearCreationStages(form(2), 4).map(stage => stage.id), ["goal", "people", "split", "plan"]);
  assert.deepEqual(getLinearCreationStages(form(2), 6).map(stage => stage.id), ["goal", "people", "split", "plan", "subtask:sub-0", "subtask:sub-1"]);
});
