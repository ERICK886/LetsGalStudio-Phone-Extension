/**
 * @file story-message-visibility.test.ts
 * @description 消息头像/名称可见性解析单测。
 * @author 池水三两升
 * @date 2026-08-04
 * @version 0.4.1
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizePresetVisibilityFlag,
  resolveStoryVisibility,
} from "./story-message-visibility.ts";

describe("normalizePresetVisibilityFlag", () => {
  it("仅严格 false 为关闭；其余（含缺失）为开启", () => {
    assert.equal(normalizePresetVisibilityFlag(false), false);
    assert.equal(normalizePresetVisibilityFlag(true), true);
    assert.equal(normalizePresetVisibilityFlag(undefined), true);
    assert.equal(normalizePresetVisibilityFlag(null), true);
    assert.equal(normalizePresetVisibilityFlag("false"), true);
    assert.equal(normalizePresetVisibilityFlag(0), true);
  });
});

describe("resolveStoryVisibility", () => {
  it("show / hide 覆盖预设；inherit 与非法值跟随预设", () => {
    assert.equal(resolveStoryVisibility("hide", true), false);
    assert.equal(resolveStoryVisibility("show", false), true);
    assert.equal(resolveStoryVisibility("inherit", false), false);
    assert.equal(resolveStoryVisibility("inherit", true), true);
    assert.equal(resolveStoryVisibility(undefined, false), false);
    assert.equal(resolveStoryVisibility("nope", true), true);
  });
});
