/**
 * @file validate.test.ts
 * @description app-id / extension-id 校验单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.2
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertValidAppId, assertValidExtensionId } from "./validate.ts";

describe("assertValidAppId", () => {
  it("接受合法 id", () => {
    assert.doesNotThrow(() => assertValidAppId("demo-shop"));
    assert.doesNotThrow(() => assertValidAppId("a1"));
  });

  it("拒绝非法 id", () => {
    assert.throws(() => assertValidAppId("Demo"), /app-id/);
    assert.throws(() => assertValidAppId("-x"), /app-id/);
    assert.throws(() => assertValidAppId("a_b"), /app-id/);
    assert.throws(() => assertValidAppId("com.acme.app"), /app-id/);
  });
});

describe("assertValidExtensionId", () => {
  it("接受合法扩展包 id（可含点号）", () => {
    assert.doesNotThrow(() => assertValidExtensionId("my-phone-host"));
    assert.doesNotThrow(() => assertValidExtensionId("com.acme.my-phone"));
    assert.doesNotThrow(() => assertValidExtensionId("ink.zenly.ext-7a9373"));
  });

  it("拒绝非法扩展包 id", () => {
    assert.throws(() => assertValidExtensionId("MyHost"), /extension-id/);
    assert.throws(() => assertValidExtensionId("-x"), /extension-id/);
    assert.throws(() => assertValidExtensionId("a_b"), /extension-id/);
  });
});
