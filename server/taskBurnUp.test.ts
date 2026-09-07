import assert from "node:assert/strict";
import test from "node:test";
import { getTaskBurnUpModel, type TaskBurnUpPoint, type TaskBurnUpSeries } from "../src/lib/taskBurnUp.ts";
import { getTaskHeadingExample } from "../src/data/taskHeadingExamples.ts";

const point = (overrides: Partial<TaskBurnUpPoint> = {}): TaskBurnUpPoint => ({
  at: "2026-08-25",
  scopeHours: 20,
  completedHours: 2,
  estimatedLeafCount: 2,
  totalLeafCount: 2,
  ...overrides,
});

const series = (...points: TaskBurnUpPoint[]): TaskBurnUpSeries => ({ source: "recorded", points });

test("没有 EWD 历史时返回明确空态，不补零或制造趋势", () => {
  let model: ReturnType<typeof getTaskBurnUpModel> | undefined;
  assert.doesNotThrow(() => { model = getTaskBurnUpModel(); });
  assert.equal(model?.state, "empty");
  assert.equal(model?.source, null);
  assert.equal(model?.latest, null);
  assert.equal(model?.coverage, null);
  assert.equal(model?.progressRatio, null);
  assert.deepEqual(model?.points, []);
  assert.equal(model?.scopePath, "");
  assert.equal(model?.completedPath, "");
  assert.equal(model?.startAt, null);
  assert.equal(model?.endAt, null);
});

test("空历史保留来源，单点只给坐标并标记历史不足", () => {
  assert.equal(getTaskBurnUpModel(series()).source, "recorded");
  const model = getTaskBurnUpModel(series(point()), { width: 160, height: 56 });
  assert.equal(model.state, "single");
  assert.equal(model.points.length, 1);
  assert.equal(model.points[0].x, 80);
  assert.equal(model.scopePath, "");
  assert.equal(model.completedPath, "");
  assert.equal(model.startAt, "2026-08-25");
  assert.equal(model.endAt, "2026-08-25");
  assert.ok(Number.isFinite(model.points[0].scopeY));
  assert.ok(Number.isFinite(model.points[0].completedY));
});

test("已验收 2h / 总范围 20h 是 10%，不是按两个任务算成 50%", () => {
  const model = getTaskBurnUpModel(series(point(), point({ at: "2026-08-26" })));
  assert.equal(model.state, "ready");
  assert.equal(model.progressRatio, 0.1);
  assert.deepEqual(model.coverage, { estimatedLeafCount: 2, totalLeafCount: 2, isComplete: true });
  assert.equal(model.latest?.scopeHours, 20);
  assert.equal(model.latest?.completedHours, 2);
});

test("总范围为 0 时仍保留真实零值，但不计算百分比或产生 NaN", () => {
  const model = getTaskBurnUpModel(series(
    point({ scopeHours: 0, completedHours: 0 }),
    point({ at: "2026-08-26", scopeHours: 0, completedHours: 0 }),
  ));
  assert.equal(model.state, "ready");
  assert.equal(model.progressRatio, null);
  assert.equal(model.latest?.scopeHours, 0);
  assert.equal(model.maxHours, 1);
  assert.ok(model.points.every((sample) => sample.scopeY === sample.completedY));
  assert.doesNotMatch(`${model.scopePath} ${model.completedPath}`, /NaN|Infinity/);
});

test("范围新增保持同一工时轴并绘制阶梯，不能斜线补出尚未发生的增长", () => {
  const model = getTaskBurnUpModel(series(
    point(),
    point({ at: "2026-08-26", scopeHours: 30, note: "新增 10h 范围" }),
  ), { width: 160, height: 56 });
  assert.equal(model.progressRatio, 2 / 30);
  assert.equal(model.maxHours, 30);
  assert.equal(model.scopePath, "M 4 20 H 156 V 4");
  assert.equal(model.completedPath, "M 4 48.8 H 156 V 48.8");
  assert.equal(model.points[0].completedY, model.points[1].completedY);
  assert.equal(model.latest?.note, "新增 10h 范围");
  assert.doesNotMatch(model.scopePath, /[LCQ]/);
});

test("取消、重开与估算修订允许净范围和已验收值下降，原始事件不丢失", () => {
  const model = getTaskBurnUpModel(series(
    point({ completedHours: 12 }),
    point({ at: "2026-08-26", scopeHours: 14, completedHours: 10, note: "取消移出范围" }),
    point({ at: "2026-08-27", scopeHours: 14, completedHours: 4, note: "重开撤回验收" }),
    point({ at: "2026-08-28", scopeHours: 10, completedHours: 2, note: "估算修订" }),
  ));
  assert.equal(model.state, "ready");
  assert.deepEqual(model.points.map((sample) => sample.scopeHours), [20, 14, 14, 10]);
  assert.deepEqual(model.points.map((sample) => sample.completedHours), [12, 10, 4, 2]);
  assert.ok(model.points[3].completedY! > model.points[2].completedY!);
  assert.equal(model.points[1].note, "取消移出范围");
  assert.equal(model.points[2].note, "重开撤回验收");
  assert.equal(model.progressRatio, 0.2);
});

test("未知值按各自线断开，不能跨越未知点连接或沿用最近已知值", () => {
  const model = getTaskBurnUpModel(series(
    point(),
    point({ at: "2026-08-26", scopeHours: null, completedHours: 3, estimatedLeafCount: 1 }),
    point({ at: "2026-08-27", scopeHours: 30, completedHours: null }),
    point({ at: "2026-08-28", scopeHours: 30, completedHours: 4 }),
  ));
  assert.equal(model.state, "partial");
  assert.equal(model.points[1].scopeY, null);
  assert.equal(model.points[2].completedY, null);
  assert.equal((model.scopePath.match(/H /g) ?? []).length, 1);
  assert.equal((model.completedPath.match(/H /g) ?? []).length, 1);
  assert.doesNotMatch(`${model.scopePath} ${model.completedPath}`, /NaN|Infinity/);
});

test("估算覆盖不完整时即使已估子集完成也不报总体百分比", () => {
  const model = getTaskBurnUpModel(series(
    point({ scopeHours: 2, completedHours: 2, estimatedLeafCount: 1 }),
    point({ at: "2026-08-26", scopeHours: 2, completedHours: 2, estimatedLeafCount: 1 }),
  ));
  assert.equal(model.state, "partial");
  assert.equal(model.progressRatio, null);
  assert.deepEqual(model.coverage, { estimatedLeafCount: 1, totalLeafCount: 2, isComplete: false });
});

test("全部工时未知时保留历史与缺估数量，但不把 null 画成零", () => {
  const model = getTaskBurnUpModel(series(
    point({ scopeHours: null, completedHours: null, estimatedLeafCount: 0 }),
    point({ at: "2026-08-26", scopeHours: null, completedHours: null, estimatedLeafCount: 0 }),
  ));
  assert.equal(model.state, "partial");
  assert.equal(model.scopePath, "");
  assert.equal(model.completedPath, "");
  assert.equal(model.progressRatio, null);
  assert.equal(model.latest?.scopeHours, null);
  assert.ok(model.points.every((sample) => sample.scopeY === null && sample.completedY === null));
});

test("最新点未知时不退回旧值冒充当前数值", () => {
  const model = getTaskBurnUpModel(series(
    point(),
    point({ at: "2026-08-26", scopeHours: null, completedHours: null, estimatedLeafCount: 0 }),
  ));
  assert.equal(model.latest?.at, "2026-08-26");
  assert.equal(model.latest?.scopeHours, null);
  assert.equal(model.progressRatio, null);
});

test("按真实时间排序且横轴反映时间距离，同一时刻最后一条输入生效", () => {
  const model = getTaskBurnUpModel(series(
    point({ at: "2026-08-31", scopeHours: 30 }),
    point({ at: "2026-08-25T08:00:00+08:00", scopeHours: 18 }),
    point({ at: "2026-08-26", scopeHours: 22 }),
    point({ at: "2026-08-25", scopeHours: 20, note: "同一时刻的修正版" }),
  ), { width: 160, height: 56 });
  assert.deepEqual(model.points.map((sample) => sample.at), ["2026-08-25", "2026-08-26", "2026-08-31"]);
  assert.equal(model.points[0].scopeHours, 20);
  assert.equal(model.points[0].note, "同一时刻的修正版");
  assert.ok(Math.abs((model.points[1].x - 4) / 152 - 1 / 6) < 1e-12);
});

test("非法日期、负数、非有限值和已验收超范围明确失效，不静默夹紧或过滤", () => {
  const invalidPoints = [
    point({ at: "not-a-date" }),
    point({ at: "2026-02-30" }),
    point({ at: "2026-02-30T08:00:00Z" }),
    point({ at: "2026-08-25T08:00:00" }),
    point({ at: "2026-08-25T24:00:00Z" }),
    point({ scopeHours: -1 }),
    point({ completedHours: -1 }),
    point({ scopeHours: Number.POSITIVE_INFINITY }),
    point({ completedHours: Number.NaN }),
    point({ scopeHours: 1, completedHours: 2 }),
    point({ estimatedLeafCount: -1 }),
    point({ estimatedLeafCount: 1.5 }),
    point({ estimatedLeafCount: 3 }),
    point({ totalLeafCount: Number.NaN }),
    point({ note: 7 as unknown as string }),
  ];
  for (const invalidPoint of invalidPoints) {
    const model = getTaskBurnUpModel(series(point(), invalidPoint));
    assert.equal(model.state, "invalid", JSON.stringify(invalidPoint));
    assert.ok(model.issue);
    assert.equal(model.latest, null);
    assert.deepEqual(model.points, []);
    assert.equal(model.scopePath, "");
    assert.equal(model.completedPath, "");
  }
});

test("同一时刻的后续有效点不能掩盖先前非法历史记录", () => {
  assert.equal(getTaskBurnUpModel(series(point({ scopeHours: -1 }), point())).state, "invalid");
});

test("全部叶子移出范围后允许真实零值，但零个叶子不能保留正工时", () => {
  const cleared = point({ at: "2026-08-26", scopeHours: 0, completedHours: 0, estimatedLeafCount: 0, totalLeafCount: 0 });
  const model = getTaskBurnUpModel(series(point(), cleared));
  assert.equal(model.state, "ready");
  assert.equal(model.latest?.totalLeafCount, 0);
  assert.equal(model.latest?.scopeHours, 0);
  assert.equal(model.progressRatio, null);
  assert.equal(getTaskBurnUpModel(series(point({ estimatedLeafCount: 0, totalLeafCount: 0 }))).state, "invalid");
  assert.equal(getTaskBurnUpModel(series(point({ scopeHours: null, estimatedLeafCount: 0, totalLeafCount: 0 }))).state, "invalid");
});

test("错误的来源、历史结构与视图尺寸不抛异常也不输出非法坐标", () => {
  for (const input of [{}, { source: "guessed", points: [] }, { source: "recorded", points: {} }]) {
    const model = getTaskBurnUpModel(input as TaskBurnUpSeries);
    assert.equal(model.state, "invalid");
    assert.ok(model.issue);
  }
  for (const options of [{ width: 0 }, { height: -1 }, { width: Number.NaN }, { height: Number.POSITIVE_INFINITY }]) {
    const model = getTaskBurnUpModel(series(point()), options);
    assert.equal(model.state, "invalid");
    assert.ok(Number.isFinite(model.width));
    assert.ok(Number.isFinite(model.height));
  }
});

test("有限的极大工时与小画布仍只输出有限坐标", () => {
  const model = getTaskBurnUpModel(series(
    point({ scopeHours: Number.MAX_VALUE, completedHours: Number.MAX_VALUE / 2 }),
    point({ at: "2026-08-26", scopeHours: Number.MAX_VALUE, completedHours: Number.MAX_VALUE }),
  ), { width: 1, height: 1 });
  assert.equal(model.state, "ready");
  assert.ok(model.points.every((sample) => Number.isFinite(sample.x) && Number.isFinite(sample.scopeY) && Number.isFinite(sample.completedY)));
  assert.doesNotMatch(`${model.scopePath} ${model.completedPath}`, /NaN|Infinity/);
});

test("建模不排序、修改或共享输入点，消费者修改输出不会污染历史", () => {
  const earlier = Object.freeze(point());
  const later = Object.freeze(point({ at: "2026-08-31" }));
  const input = { source: "recorded" as const, points: [later, earlier] };
  Object.freeze(input.points);
  Object.freeze(input);
  const model = getTaskBurnUpModel(input);
  assert.equal(input.points[0], later);
  assert.notEqual(model.points[0], earlier);
  assert.notEqual(model.latest, later);
  model.points[0].scopeHours = 999;
  assert.equal(earlier.scopeHours, 20);
  assert.equal(later.scopeHours, 20);
});

test("示例目录只命中明确任务，每项保留业务完成标准，父级趋势明确标记示例", () => {
  for (const taskId of ["fragrance-final-decision", "fragrance-creator-wrapup", "weekly-retro-notes"]) {
    const example = getTaskHeadingExample(taskId);
    assert.ok(example);
    assert.ok(example.completionCriteria.length >= 2);
    assert.ok(example.completionCriteria.every((criterion) => criterion.trim().length > 12));
  }
  const parent = getTaskHeadingExample("fragrance-creator-wrapup")!;
  assert.equal(parent.burnUp?.source, "example");
  assert.equal(parent.burnUp?.points[0].at, "2026-08-25");
  assert.equal(parent.burnUp?.points.at(-1)?.at, "2026-08-31");
  assert.equal(getTaskBurnUpModel(parent.burnUp).state, "ready");
  const weekly = getTaskHeadingExample("weekly-retro-notes")!;
  assert.equal(weekly.burnUp?.source, "example");
  assert.equal(weekly.burnUp?.points.at(-1)?.scopeHours, 7);
  assert.equal(weekly.burnUp?.points.at(-1)?.completedHours, 2);
  assert.equal(getTaskBurnUpModel(weekly.burnUp).state, "ready");
  assert.equal(getTaskHeadingExample("unknown-task"), undefined);
  assert.equal(getTaskHeadingExample("__proto__"), undefined);
  assert.equal(getTaskHeadingExample("constructor"), undefined);
});

test("没有子任务的任务不提供燃起图样例，但仍保留完成标准", () => {
  for (const taskId of ["fragrance-final-decision", "fragrance-creator-business", "fragrance-content", "fragrance-live", "fragrance-product", "fragrance-growth", "fragrance-data", "fragrance-compliance"]) {
    const example = getTaskHeadingExample(taskId);
    assert.ok(example?.completionCriteria.length);
    assert.equal(example.burnUp, undefined);
  }
});

test("父任务示例只描述八个叶子，不额外加上父任务自身", () => {
  const model = getTaskBurnUpModel(getTaskHeadingExample("fragrance-creator-wrapup")?.burnUp);
  assert.deepEqual(model.points.map((sample) => sample.totalLeafCount), [6, 6, 7, 7, 8, 8, 8]);
  assert.equal(model.latest?.scopeHours, 43);
  assert.equal(model.latest?.completedHours, 15);
});

test("同一示例重复读取相互隔离，修改一次读取不会改写后续示例", () => {
  const first = getTaskHeadingExample("fragrance-creator-wrapup")!;
  const before = getTaskHeadingExample("fragrance-creator-wrapup")!;
  first.completionCriteria[0] = "消费者临时编辑";
  first.burnUp!.points[0].scopeHours = 999;
  assert.deepEqual(getTaskHeadingExample("fragrance-creator-wrapup"), before);
});
