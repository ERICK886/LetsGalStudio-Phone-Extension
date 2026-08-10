/**
 * @file tokens.test.ts
 * @description 手机编辑器主题 token 单测。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getThemeTokens } from "./tokens";

describe("getThemeTokens", () => {
  it("dark accent is #DB2777", () => {
    assert.equal(getThemeTokens("dark").accent, "#DB2777");
  });

  it("light accent is pink family", () => {
    const accent = getThemeTokens("light").accent.toUpperCase();
    assert.ok(accent === "#DB2777" || accent === "#BE185D");
  });

  it("dark bgBase is near #17171B", () => {
    assert.equal(getThemeTokens("dark").bgBase.toUpperCase(), "#17171B");
  });
});
