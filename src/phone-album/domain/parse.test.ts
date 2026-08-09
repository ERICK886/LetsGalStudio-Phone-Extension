/**
 * @file parse.test.ts
 * @description parse 纯函数单测。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeId, parseCommaIds, parseMediaType } from "./parse.js";

describe("normalizeId", () => {
  it("trims and rejects empty", () => {
    assert.equal(normalizeId("  a1  "), "a1");
    assert.equal(normalizeId("   "), "");
    assert.equal(normalizeId(null), "");
  });
});

describe("parseCommaIds", () => {
  it("splits unique ids", () => {
    assert.deepEqual(parseCommaIds("a, b, a"), ["a", "b"]);
    assert.deepEqual(parseCommaIds(""), []);
  });
});

describe("parseMediaType", () => {
  it("accepts image|video", () => {
    assert.equal(parseMediaType("image"), "image");
    assert.equal(parseMediaType("VIDEO"), "video");
    assert.equal(parseMediaType("gif"), null);
  });
});
