import assert from "node:assert/strict";
import test from "node:test";
import { formatDisplayDate, formatDisplayDateTime, formatDisplayMonth, formatDisplayTime, formatLegacyDateLabel, formatRelativeDateTime, formatSystemDateText } from "../src/shared/lib/date-time.ts";

const now = new Date(2026, 9, 13, 20).getTime();

test("日历日期保持原日，没有时分也不会添加 AM/PM，跨年保留年份", () => {
  for (const timeZone of ["America/Los_Angeles", "Asia/Shanghai", "Pacific/Kiritimati"]) {
    assert.equal(formatDisplayDate("2026-09-14", { now, timeZone }), "Sep 14");
    assert.equal(formatDisplayDate("2025-09-14", { now, timeZone }), "Sep 14, 2025");
    assert.equal(formatDisplayDate("2026-09-14", { now, timeZone, year: "always" }), "Sep 14, 2026");
    assert.equal(formatDisplayMonth("2026-09-01", { timeZone }), "Sep 2026");
    assert.equal(formatDisplayDateTime("2026-09-14", { now, timeZone }), null);
  }
});

test("中文日历日期和月份随界面语言呈现，跨时区仍保留原日", () => {
  for (const timeZone of ["America/Los_Angeles", "Asia/Shanghai", "Pacific/Kiritimati"]) {
    const options = { locale: "zh-CN", now, timeZone };
    assert.equal(formatDisplayDate("2026-09-14", options), "9月14日");
    assert.equal(formatDisplayDate("2025-09-14", options), "2025年9月14日");
    assert.equal(formatDisplayDate("2026-09-14", { ...options, year: "always" }), "2026年9月14日");
    assert.equal(formatDisplayMonth("2026-09-01", options), "2026年9月");
  }
});

test("真实时刻使用查看者时区及12小时制，完整提示含年份", () => {
  const value = "2026-09-14T09:30:00Z";
  assert.equal(formatDisplayDateTime(value, { now, timeZone: "Asia/Shanghai" }), "Sep 14, 5:30 PM");
  assert.equal(formatDisplayDateTime(value, { now, timeZone: "America/Los_Angeles" }), "Sep 14, 2:30 AM");
  assert.equal(formatDisplayDateTime(value, { now, timeZone: "Asia/Shanghai", year: "always" }), "Sep 14, 2026, 5:30 PM");
  assert.equal(formatDisplayTime("00:05"), "12:05 AM");
  assert.equal(formatDisplayTime("12:00"), "12:00 PM");
});

test("中文时刻使用24小时制，午夜和完整提示不残留英文", () => {
  const options = { locale: "zh-CN", now, timeZone: "Asia/Shanghai" };
  assert.equal(formatDisplayDateTime("2026-09-14T09:30:00Z", options), "9月14日 17:30");
  assert.equal(formatDisplayDateTime("2026-09-14T09:30:00Z", { ...options, year: "always" }), "2026年9月14日 17:30");
  assert.equal(formatDisplayDateTime("2026-09-14T09:30:00Z", { ...options, timeZone: "America/Los_Angeles" }), "9月14日 02:30");
  assert.equal(formatDisplayTime("00:05", options), "00:05");
  assert.equal(formatDisplayTime("12:00", options), "12:00");
  assert.equal(formatDisplayTime("09:05", options), "09:05");
});

test("相对词遵循语言，同年未来日期省年而完整提示仍保留", () => {
  const recent = now - 300_000;
  assert.equal(formatRelativeDateTime(recent, "zh-CN", now)?.label, "5分钟前");
  assert.equal(formatRelativeDateTime(recent, "en", now)?.label, "5 minutes ago");
  assert.deepEqual(formatRelativeDateTime(new Date(2026, 11, 1, 9), "zh-CN", now), { label: "12月1日 09:00", full: "2026年12月1日 09:00" });
});

test("旧演示标签只转换已有信息，不猜年份或把旧文本变成真实时刻", () => {
  for (const locale of ["zh-CN", "en"]) {
    assert.equal(formatLegacyDateLabel("9/14 17:30", locale, { now }), locale === "en" ? "Sep 14, 5:30 PM" : "9月14日 17:30");
    assert.equal(formatLegacyDateLabel("9 月 14 日", locale, { now, year: "always" }), locale === "en" ? "Sep 14" : "9月14日");
    assert.equal(formatLegacyDateLabel("9月1日 — 9月14日", locale, { now }), locale === "en" ? "Sep 1 — Sep 14" : "9月1日 — 9月14日");
    assert.equal(formatLegacyDateLabel("2025年9月14日 17:30", locale, { now }), locale === "en" ? "Sep 14, 2025, 5:30 PM" : "2025年9月14日 17:30");
    assert.equal(formatDisplayDateTime("9/14 17:30"), null);
  }
  assert.equal(formatLegacyDateLabel("今天 09:20", "en"), "Today 9:20 AM");
  assert.equal(formatLegacyDateLabel("昨天 18:40", "zh-CN"), "昨天 18:40");
  assert.equal(formatLegacyDateLabel("3小时前", "en"), "3 hours ago");
});

test("非法日期和未知历史文字不被格式化成看似有效的时间", () => {
  for (const value of ["invalid", "2026-02-30", "2026-02-30T10:00:00Z", "9/14"]) assert.equal(formatDisplayDate(value), null);
  assert.equal(formatDisplayTime("24:05"), null);
  assert.equal(formatLegacyDateLabel("9/31 17:30"), "9/31 17:30");
  assert.equal(formatLegacyDateLabel("从旧版导入"), "从旧版导入");
});

test("旧英文日期和时钟切回中文，不补造缺失年份或时间点", () => {
  assert.equal(formatLegacyDateLabel("Sep 14", "zh-CN", { now, year: "always" }), "9月14日");
  assert.equal(formatLegacyDateLabel("Sep 14, 2025, 5:30 PM", "zh-CN", { now }), "2025年9月14日 17:30");
  assert.equal(formatLegacyDateLabel("Sep 14, 5:30 PM", "zh-CN", { now }), "9月14日 17:30");
  assert.equal(formatLegacyDateLabel("Sep 1 — Sep 14", "zh-CN", { now }), "9月1日 — 9月14日");
  assert.equal(formatLegacyDateLabel("Yesterday 12:05 AM", "zh-CN", { now }), "昨天 00:05");
  assert.equal(formatLegacyDateLabel("Today 12:00 PM", "zh-CN", { now }), "今天 12:00");
  assert.equal(formatLegacyDateLabel("5:30 PM", "zh-CN", { now }), "17:30");
  for (const value of ["Sep 31", "Sep 14, 13:30 PM", "Sep 14, 0:30 AM", "Feb 30, 2025"]) assert.equal(formatLegacyDateLabel(value, "zh-CN", { now }), value);
  assert.equal(formatDisplayDateTime("Sep 14, 5:30 PM", { locale: "zh-CN" }), null);
  assert.equal(formatSystemDateText("截止 Sep 14, 2025，更新时间 Sep 13, 5:30 PM。", "zh-CN", { now }), "截止 2025年9月14日，更新时间 9月13日 17:30。");
});

test("系统日期文案保留周边说明，只转已识别日期片段", () => {
  assert.equal(formatSystemDateText("预计 2026-09-14 完成，昨天 18:40 更新。", "zh-CN", { now }), "预计 9月14日 完成，昨天 18:40 更新。");
  assert.equal(formatSystemDateText("截止 9 月 14 日，无时分记录。", "zh-CN", { now }), "截止 9月14日，无时分记录。");
  assert.equal(formatSystemDateText("预计 2026-09-14 完成，昨天 18:40 更新。", "en", { now }), "预计 Sep 14 完成，Yesterday 6:40 PM 更新。");
});
