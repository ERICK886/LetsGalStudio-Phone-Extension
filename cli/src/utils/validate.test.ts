/**
 * @file validate.test.ts
 * @description app-id 校验单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertValidAppId } from "./validate.ts";

describe("assertValidAppId", () => {
  it("接受合法 id", () => {
    assert.doesNotThrow(() => assertValidAppId("demo-shop"));
    assert.doesNotThrow(() => assertValidAppId("a1"));
  });

  it("拒绝非法 id", () => {
    assert.throws(() => assertValidAppId("Demo"), /app-id/);
    assert.throws(() => assertValidAppId("-x"), /app-id/);
    assert.throws(() => assertValidAppId("a_b"), /app-id/);
  });
});
