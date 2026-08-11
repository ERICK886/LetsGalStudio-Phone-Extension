/**
 * @file shortcut-field.test.ts
 * @description 快捷键展示与事件解析单测。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayKeyLabel,
  shortcutFromKeyboardEvent,
  shortcutToChips,
} from "./shortcut-utils.ts";

describe("shortcut display helpers", () => {
  it("maps ArrowUp to ↑", () => {
    assert.equal(displayKeyLabel("ArrowUp"), "↑");
  });

  it("maps KeyP to P", () => {
    assert.equal(displayKeyLabel("KeyP"), "P");
  });

  it("shortcutToChips splits modifiers", () => {
    assert.deepEqual(shortcutToChips("Ctrl+KeyP"), ["Ctrl", "P"]);
    assert.deepEqual(shortcutToChips("ArrowUp"), ["↑"]);
  });
});

describe("shortcutFromKeyboardEvent", () => {
  it("builds Ctrl+KeyP", () => {
    assert.equal(
      shortcutFromKeyboardEvent({
        code: "KeyP",
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        metaKey: false,
      }),
      "Ctrl+KeyP",
    );
  });

  it("returns null for bare modifier", () => {
    assert.equal(
      shortcutFromKeyboardEvent({
        code: "ControlLeft",
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        metaKey: false,
      }),
      null,
    );
  });
});
