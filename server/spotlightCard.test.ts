import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { GlowCard } from "../src/components/ui/spotlight-card.tsx";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("关闭聚光效果时不跟踪指针，不将动效设置写到DOM属性", () => {
  const card = GlowCard({ spotlight: false });
  const props = card.props as { spotlight?: boolean; onPointerMove: (event: unknown) => void };
  let reads = 0;
  props.onPointerMove({ pointerType: "mouse", currentTarget: { getBoundingClientRect: () => { reads++; return {}; }, style: { setProperty: () => {} } } });
  assert.equal(reads, 0);
  assert.equal(props.spotlight, undefined);
});
