import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialTaskListFilters } from "../src/components/taskListFilters.ts";
import { groupTasksByBoardStatus, taskBoardStatusOrder, taskBoardStatusTone } from "../src/lib/taskBoard.ts";

const tasks = [
  { id: "done", status: "已完成" as const },
  { id: "todo", status: "待开始" as const },
  { id: "doing", status: "进行中" as const },
  { id: "doing-2", status: "进行中" as const },
];

test("任务看板按统一状态顺序分组并跳过空列", () => {
  assert.deepEqual(groupTasksByBoardStatus(tasks).map((group) => ({
    ids: group.tasks.map((task) => task.id),
    status: group.status,
    tone: group.tone,
  })), [
    { ids: ["todo"], status: "待开始", tone: "not-started" },
    { ids: ["doing", "doing-2"], status: "进行中", tone: "in-progress" },
    { ids: ["done"], status: "已完成", tone: "completed" },
  ]);
  assert.deepEqual(taskBoardStatusOrder, ["待开始", "进行中", "待审核", "已阻塞", "已完成", "已取消"]);
  assert.equal(taskBoardStatusTone["已阻塞"], "blocked");
});

test("任务列表初始条件展示团队全部任务", () => {
  assert.deepEqual(createInitialTaskListFilters("周岚"), {
    view: "all",
    completion: "all",
    owner: "all",
    status: "all",
    tag: "all",
  });
});

test("共享人员选择器提供范围选项与紧凑筛选触发器", () => {
  const source = readFileSync(new URL("../src/components/PersonPicker.tsx", import.meta.url), "utf8");
  assert.match(source, /scopeOption/);
  assert.match(source, /triggerVariant === "filter"/);
  assert.match(source, /UsersRound/);
  assert.match(source, /isScope \? person\.name/);
  assert.match(source, /triggerVariant === "filter"[\s\S]*text-\(length:--ad-text-body-sm\) font-medium/);
});

test("任务筛选控件共享同一字体、字号和高度标尺", () => {
  const tokens = readFileSync(new URL("../styles/agentdoor-tokens.css", import.meta.url), "utf8");
  const input = readFileSync(new URL("../src/components/ui/input.tsx", import.meta.url), "utf8");
  const select = readFileSync(new URL("../src/components/ui/select.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(tokens, /--ad-font-sans:\s*"Geist Variable"/);
  assert.match(tokens, /--ad-text-body-sm:\s*14px/);
  assert.match(tokens, /\[data-slot="input"\],[\s\S]*\[data-slot="select-trigger"\],[\s\S]*font-size:\s*var\(--ad-text-body-sm\)/);
  assert.match(input, /data-slot="input"/);
  assert.match(select, /data-slot="select-trigger"/);
  assert.match(styles, /\.person-picker-trigger-filter\s*\{[^}]*height:\s*var\(--ad-control-height-md\)/s);
});

test("任务列表提供列表与看板投影并复用同一筛选结果", () => {
  const listSource = readFileSync(new URL("../src/components/WorkspaceList.tsx", import.meta.url), "utf8");
  const boardSource = readFileSync(new URL("../src/components/WorkspaceTaskBoard.tsx", import.meta.url), "utf8");
  assert.match(listSource, /type WorkspaceListView = "board" \| "list"/);
  assert.match(listSource, /<WorkspaceTaskBoard/);
  assert.match(listSource, /tasks={visibleNodes}/);
  assert.match(listSource, /aria-pressed={view === "board"}/);
  assert.match(boardSource, /taskBoardStatusOrder/);
  assert.match(boardSource, /onTaskSelect\(task\)/);
  assert.match(boardSource, /draggable/);
  assert.match(boardSource, /onTaskStatusChange\(draggedTaskId, status\)/);
  assert.doesNotMatch(boardSource, /<small>{group\.status}<\/small>/);
});

test("任务看板拥有共享视觉、横向滚动和可见焦点", () => {
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(styles, /\.workspace-task-view-switch/);
  assert.match(styles, /\.workspace-task-board/);
  assert.match(styles, /\.workspace-task-board\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(styles, /\.workspace-task-board-column\s*\{[^}]*min-height:/s);
  assert.match(styles, /\.workspace-task-board-card-open:focus-visible/s);
});

test("看板移动菜单的标签与状态项位于同一个 Base UI 菜单分组，打开时不缺少上下文", () => {
  const source = readFileSync(new URL("../src/components/WorkspaceTaskBoard.tsx", import.meta.url), "utf8");
  assert.ok(/<DropdownMenuGroup>\s*<DropdownMenuLabel>移动到<\/DropdownMenuLabel>[\s\S]*?taskBoardStatusOrder\.map\([\s\S]*?<\/DropdownMenuGroup>/.test(source), "GroupLabel 必须放在菜单 Group 内，不能直接挂在 Popup 下");
});
