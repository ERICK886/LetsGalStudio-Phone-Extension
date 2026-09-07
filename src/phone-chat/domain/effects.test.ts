import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyReplyEffects,
  calculateReplyEffectValue,
  normalizeReplyEffectOperator,
  parseEffectValue,
} from "./effects.ts";

describe("reply effects", () => {
  it("保留原有直接赋值值解析", () => {
    assert.equal(parseEffectValue("10"), 10);
    assert.equal(parseEffectValue("true"), true);
    assert.equal(parseEffectValue("null"), null);
    assert.equal(parseEffectValue(" hello "), " hello ");
    assert.equal(normalizeReplyEffectOperator(undefined), "=");
    assert.equal(normalizeReplyEffectOperator("invalid"), "=");
  });

  it("计算常用复合赋值", () => {
    assert.equal(calculateReplyEffectValue(10, "+=", 3), 13);
    assert.equal(calculateReplyEffectValue(10, "-=", 3), 7);
    assert.equal(calculateReplyEffectValue(10, "*=", 3), 30);
    assert.equal(calculateReplyEffectValue(10, "/=", 4), 2.5);
    assert.equal(calculateReplyEffectValue(10, "%=", 4), 2);
    assert.equal(calculateReplyEffectValue(undefined, "=", "new"), "new");
  });

  it("拒绝非数值运算、除零和非有限结果", () => {
    assert.throws(() => calculateReplyEffectValue(undefined, "+=", 1));
    assert.throws(() => calculateReplyEffectValue("10", "-=", 1));
    assert.throws(() => calculateReplyEffectValue(10, "+=", "1"));
    assert.throws(() => calculateReplyEffectValue(10, "/=", 0));
    assert.throws(() => calculateReplyEffectValue(Number.MAX_VALUE, "*=", 2));
  });

  it("按顺序执行赋值与复合赋值", () => {
    const values = new Map<string, string | number | boolean | null>();
    const ctx = {
      variables: {
        get(name: string) {
          return values.get(name);
        },
        set(name: string, value: string | number | boolean | null) {
          values.set(name, value);
        },
      },
    };

    applyReplyEffects(ctx as never, [
      { variable: "score", value: "10" },
      { variable: "score", operator: "+=", value: "5" },
      { variable: "score", operator: "-=", value: "3" },
    ]);

    assert.equal(values.get("score"), 12);
  });
});
