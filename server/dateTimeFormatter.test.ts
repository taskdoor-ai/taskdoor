import assert from "node:assert/strict";
import test from "node:test";
import { getDateTimeFormatter as get } from "../src/shared/lib/date-time-format.ts";
import { formatDisplayDate } from "../src/shared/lib/date-time.ts";

test("显式时区、语言与完整格式相同时复用格式器，选项顺序不影响复用", () => {
  const first = get("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
  const second = get("en-US", { day: "numeric", month: "short", timeZone: "UTC", year: undefined });

  assert.equal(second, first);
  assert.equal(first.format(new Date("2026-10-22T01:00:00Z")), "Oct 22");
});

test("语言、时区及日期时间选项变化均保持各自的原生格式", () => {
  const instant = new Date("2026-10-22T01:05:07.125Z");
  const cases: Array<[string, Intl.DateTimeFormatOptions]> = [
    ["en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" }],
    ["zh-CN", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" }],
    ["en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "short", day: "numeric" }],
    ["en-US", { timeZone: "UTC", year: "2-digit", month: "long", day: "2-digit", weekday: "long" }],
    ["en-US", { timeZone: "UTC", dateStyle: "long", timeStyle: "short" }],
    ["en-US", { timeZone: "UTC", dateStyle: "short", timeStyle: "long" }],
    ["en-US", { timeZone: "UTC", hour: "numeric", minute: "numeric", hourCycle: "h23" }],
    ["en-US", { timeZone: "UTC", hour: "numeric", minute: "numeric", hourCycle: "h12" }],
    ["en-US", { timeZone: "UTC", calendar: "buddhist", year: "numeric", month: "numeric" }],
    ["en-US", { timeZone: "UTC", numberingSystem: "arab", year: "numeric", month: "numeric" }],
    ["en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3, timeZoneName: "longOffset" }],
  ];
  const instances = cases.map(([locale, options]) => get(locale, options));

  assert.equal(new Set(instances).size, cases.length);
  cases.forEach(([locale, options], index) => assert.deepEqual(instances[index].formatToParts(instant), new Intl.DateTimeFormat(locale, options).formatToParts(instant)));
});

test("重复的非法时区仍抛原生错误，随后合法选项可正常使用", () => {

  for (let attempt = 0; attempt < 2; attempt += 1) assert.throws(() => get("en-US", { timeZone: "Invalid/TimeZone" }), RangeError);
  assert.equal(get("en-US", { timeZone: "Asia/Tokyo", hour: "2-digit", hour12: false }).format(new Date("2026-10-22T01:00:00Z")), "10");
});

test("格式器缓存有容量上限，常用实例保留而最旧实例可淘汰", () => {
  const options = { timeZone: "UTC", year: "numeric" } as const;
  const first = get("en-US-x-first", options);
  const oldest = get("en-US-x-oldest", options);
  for (let index = 0; index < 62; index += 1) get(`en-US-x-cache-${index}`, options);
  assert.equal(get("en-US-x-first", options), first, "重新访问常用实例");
  get("en-US-x-overflow", options);

  assert.equal(get("en-US-x-first", options), first);
  assert.notEqual(get("en-US-x-oldest", options), oldest);
});

test("未指定时区时不固定本地默认时区，系统时区变化后立即生效", () => {
  const originalTimeZone = process.env.TZ;
  const options = { hour: "2-digit", hour12: false } as const;
  const instant = new Date("2026-10-22T01:00:00Z");
  try {
    process.env.TZ = "UTC";
    const utc = get("en-US", options);
    assert.equal(utc.format(instant), "01");
    process.env.TZ = "Asia/Shanghai";
    const shanghai = get("en-US", options);
    assert.notEqual(shanghai, utc);
    assert.equal(shanghai.format(instant), "09");
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  }
});

test("带原型或 getter 的选项保留 Intl 原生读取方式", () => {
  const inherited = Object.create({ timeZone: "UTC", year: "numeric" }) as Intl.DateTimeFormatOptions;
  assert.equal(get("en-US", inherited).format(new Date("2026-10-22T01:00:00Z")), "2026");
  let reads = 0;
  const options = { get timeZone() { reads += 1; return "UTC"; }, year: "numeric" } as const;
  new Intl.DateTimeFormat("en-US", options);
  const nativeReads = reads;
  reads = 0;
  assert.equal(get("en-US", options).format(new Date("2026-10-22T01:00:00Z")), "2026");
  assert.equal(reads, nativeReads, "键计算不能额外调用用户 getter");
});

test("固定显示或隐藏年份不额外构造用于跨年比较的格式器", () => {
  const NativeDateTimeFormat = Intl.DateTimeFormat;
  let yearComparisons = 0;
  Intl.DateTimeFormat = new Proxy(NativeDateTimeFormat, {
    construct(target, argumentsList, newTarget) {
      const options = argumentsList[1] as Intl.DateTimeFormatOptions | undefined;
      if (options?.year && !options.month && !options.day && !options.hour) yearComparisons += 1;
      return Reflect.construct(target, argumentsList, newTarget);
    },
  });
  try {
    const options = { locale: "en", now: Date.parse("2026-10-22T00:00:00Z"), timeZone: "Asia/Tokyo" };
    assert.equal(formatDisplayDate("2025-09-14", { ...options, year: "never" }), "Sep 14");
    assert.equal(formatDisplayDate("2026-09-14", { ...options, year: "always" }), "Sep 14, 2026");
    assert.equal(yearComparisons, 0);
  } finally { Intl.DateTimeFormat = NativeDateTimeFormat; }
});
