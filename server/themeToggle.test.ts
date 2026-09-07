import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { Moon, Sun } from "lucide-react";
import type { Theme } from "../src/components/ThemeToggle";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { ThemeToggle } = await import("../src/components/ThemeToggle");
const { DropdownMenuItem } = await import("../src/components/ui/dropdown-menu");

const getThemeToggleParts = (theme: Theme, onToggle: () => void = () => undefined) => {
  const element = ThemeToggle({ onToggle, theme });
  const children = React.Children.toArray(element.props.children);
  const icon = children[0];
  const label = children[1];

  assert.ok(React.isValidElement(icon), "主题切换应显示当前动作对应的图标");
  assert.ok(React.isValidElement(label), "主题切换应显示完整动作名称");

  return {
    element,
    icon: icon as React.ReactElement<{ "aria-hidden"?: boolean | string }>,
    label: label as React.ReactElement<{ children?: string }>,
  };
};

test("浅色主题提供切换到深色的完整动作名称", () => {
  const { element, icon, label } = getThemeToggleParts("light");

  assert.equal(element.props["aria-label"], "切换到深色");
  assert.equal(element.props.title, "切换到深色");
  assert.equal(label.props.children, "切换到深色");
  assert.equal(icon.type, Moon);
  assert.equal(icon.props["aria-hidden"], "true");
});

test("深色主题提供切换到浅色的完整动作名称", () => {
  const { element, icon, label } = getThemeToggleParts("dark");

  assert.equal(element.props["aria-label"], "切换到浅色");
  assert.equal(element.props.title, "切换到浅色");
  assert.equal(label.props.children, "切换到浅色");
  assert.equal(icon.type, Sun);
  assert.equal(icon.props["aria-hidden"], "true");
});

test("主题切换把菜单激活动作交给唯一回调", () => {
  let toggleCount = 0;
  const onToggle = () => { toggleCount += 1; };
  const { element } = getThemeToggleParts("light", onToggle);

  assert.equal(element.props.onClick, onToggle);
  assert.equal(element.type, DropdownMenuItem);
  assert.notEqual(element.props.closeOnClick, false);
  element.props.onClick();
  assert.equal(toggleCount, 1);
});
