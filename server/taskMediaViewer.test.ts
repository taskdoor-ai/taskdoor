import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nProvider } from "../src/shared/i18n/I18nProvider.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
register("data:text/javascript," + encodeURIComponent("export async function load(url, context, nextLoad) {\n  if (url.endsWith(\".css\")) return { format: \"module\", source: \"export default {}\", shortCircuit: true };\n  return nextLoad(url, context);\n}"), import.meta.url);
const { TaskMediaViewer } = await import("../src/features/tasks/files/components/TaskMediaViewer.tsx");
const render = (kind: "audio" | "video") => renderToStaticMarkup(createElement(I18nProvider, { initialLocale: "zh-CN", children: createElement(TaskMediaViewer, { kind, name: kind === "video" ? "总览.mp4" : "简报.mp3", url: "blob:original" }) }));

test("video delegates centered play/loading and bottom controls to Media Chrome without autoplay", () => {
  const html = render("video");
  assert.match(html, /视频播放器/);
  assert.match(html, /<media-controller[^>]*aria-labelledby=/);
  assert.match(html, /<media-controller[^>]*autohide="2"/);
  assert.match(html, /<media-play-button[^>]*slot="centered-chrome"/);
  assert.match(html, /<media-loading-indicator[^>]*slot="centered-chrome"/);
  assert.match(html, /<div class="task-media-bottom-chrome">/);
  assert.match(html, /<media-time-range/);
  assert.match(html, /<media-fullscreen-button/);
  assert.match(html, /<video[^>]*src="blob:original"/);
  assert.doesNotMatch(html, /autoplay|<audio|slot="bottom-chrome"/);
});

test("audio keeps always-visible transport and its own accessible name without video-only chrome", () => {
  const html = render("audio");
  assert.match(html, /音频播放器/);
  assert.match(html, /class="task-media-viewer task-media-viewer-audio"/);
  assert.match(html, /<media-controller[^>]*autohide="-1"/);
  assert.match(html, /<audio[^>]*src="blob:original"/);
  assert.match(html, /<media-mute-button/);
  assert.match(html, /<media-volume-range/);
  assert.equal((html.match(/<media-play-button\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, /autoplay|<video|<media-play-button[^>]*slot="centered-chrome"|<media-fullscreen-button/);
});
