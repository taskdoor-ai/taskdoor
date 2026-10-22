import assert from "node:assert/strict";
import test from "node:test";
import { formatFileSize } from "../src/shared/lib/file-size.ts";

test("文件大小使用十进制单位，零值和单位边界可读", () => {
  for (const [bytes, expected] of [
    [0, "0 B"], [999, "999 B"], [1000, "1.0 KB"], [4096, "4.1 KB"],
    [999_999, "1.0 MB"], [1_000_000, "1.0 MB"], [2_000_000, "2.0 MB"],
  ] as const) assert.equal(formatFileSize(bytes), expected);
  assert.equal(formatFileSize(20 * 1024 * 1024, { fractionDigits: 2 }), "20.97 MB");
  assert.equal(formatFileSize(2 * 1024 * 1024, { fractionDigits: 2 }), "2.10 MB");
});

test("真实字节优先于旧标签；没有可靠字节时不从历史四舍五入标签推算", () => {
  assert.equal(formatFileSize(2_000_000, { fallback: "1.9 MiB" }), "2.0 MB");
  assert.equal(formatFileSize(undefined, { fallback: "1.9 MiB" }), "1.9 MiB");
  for (const bytes of [undefined, Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5]) {
    assert.equal(formatFileSize(bytes), "");
  }
});
