/**
 * @file method-params-boolean.test.ts
 * @description coerceMethodBoolean 兼容 Studio 布尔/字符串封装。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coerceMethodBoolean } from "./method-params.ts";

describe("coerceMethodBoolean", () => {
  it("reads strict booleans", () => {
    assert.equal(coerceMethodBoolean(true, false), true);
    assert.equal(coerceMethodBoolean(false, true), false);
  });

  it("treats string false as false (Studio quirk)", () => {
    assert.equal(coerceMethodBoolean("false", true), false);
    assert.equal(coerceMethodBoolean("FALSE", true), false);
    assert.equal(coerceMethodBoolean("0", true), false);
  });

  it("unwraps { value }", () => {
    assert.equal(coerceMethodBoolean({ value: false }, true), false);
    assert.equal(coerceMethodBoolean({ value: "false" }, true), false);
  });

  it("uses default for undefined", () => {
    assert.equal(coerceMethodBoolean(undefined, true), true);
    assert.equal(coerceMethodBoolean(undefined, false), false);
  });
});
