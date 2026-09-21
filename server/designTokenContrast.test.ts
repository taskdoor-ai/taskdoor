import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../styles/agentdoor-tokens.css", import.meta.url), "utf8");
const declarations = (selector: string) => {
  const start = source.indexOf(`${selector} {`);
  assert.ok(start >= 0, `Missing theme ${selector}`);
  return Object.fromEntries([...source.slice(start, source.indexOf("}", start)).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
};
const light = declarations(":root");
const dark = { ...light, ...declarations('[data-theme="dark"]') };
const color = (tokens: Record<string, string>, name: string): string => {
  const value = tokens[name];
  assert.ok(value, `Missing color token ${name}`);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (alias) return color(tokens, alias[1]);
  assert.match(value, /^#[\da-f]{6}$/i, `Expected a resolved color for ${name}`);
  return value;
};
const luminance = (hex: string) => {
  const rgb = hex.slice(1).match(/../g)!.map((channel) => parseInt(channel, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const contrast = (a: string, b: string) => {
  const values = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

for (const [theme, tokens] of Object.entries({ light, dark })) {
  test(`${theme}: 正文、按钮与语义提示保留可读对比度`, () => {
    for (const [foreground, background] of [
      ["--ad-ink", "--ad-canvas"],
      ["--ad-ink-secondary", "--ad-surface-subtle"],
      ["--ad-ink-tertiary", "--ad-surface"],
      ["--ad-route-ink", "--ad-route-soft"],
      ["--ad-route-ink", "--ad-route-soft-hover"],
      ["--ad-action-ink", "--ad-route"],
      ["--ad-action-ink", "--ad-route-hover"],
      ["--ad-action-ink", "--ad-route-active"],
      ["--ad-inference", "--ad-inference-soft"],
      ["--ad-inference", "--ad-inference-hover"],
      ["--ad-fact", "--ad-fact-soft"],
      ["--ad-danger", "--ad-danger-soft"],
    ]) {
      const ratio = contrast(color(tokens, foreground), color(tokens, background));
      assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio.toFixed(2)}`);
    }
  });

  test(`${theme}: 勾选标记、开关选中态及焦点可辨认`, () => {
    for (const [foreground, background] of [
      ["--ad-checkbox-check", "--ad-checkbox-fill"],
      ["--ad-checkbox-check", "--ad-checkbox-fill-hover"],
      ["--ad-checkbox-border", "--ad-surface"],
      ["--ad-switch-thumb-on", "--ad-switch-track-on"],
      ["--ad-focus", "--ad-surface"],
    ]) {
      const ratio = contrast(color(tokens, foreground), color(tokens, background));
      assert.ok(ratio >= 3, `${foreground} on ${background}: ${ratio.toFixed(2)}`);
    }
  });
}
