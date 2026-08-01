/**
 * @file host-extension-id.test.ts
 * @description 宿主扩展包 id 解析单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.4.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_PHONE_HOST_EXTENSION_ID,
  getOpenPhoneActionId,
  getPhoneHostExtensionId,
  resolvePhoneHostExtensionId,
} from "./host-extension-id.ts";

describe("resolvePhoneHostExtensionId", () => {
  it("undefined / 空串 / 空白 → 默认官方 id", () => {
    assert.equal(
      resolvePhoneHostExtensionId(undefined),
      DEFAULT_PHONE_HOST_EXTENSION_ID,
    );
    assert.equal(resolvePhoneHostExtensionId(""), DEFAULT_PHONE_HOST_EXTENSION_ID);
    assert.equal(
      resolvePhoneHostExtensionId("   "),
      DEFAULT_PHONE_HOST_EXTENSION_ID,
    );
  });

  it("非空注入值 trim 后返回", () => {
    assert.equal(
      resolvePhoneHostExtensionId(" ink.zenly.phone-app-foo "),
      "ink.zenly.phone-app-foo",
    );
  });
});

describe("getPhoneHostExtensionId / getOpenPhoneActionId", () => {
  it("未注入时回退默认，并拼出 open-phone 动作", () => {
    // node:test 下 Vite define 不存在 → 走默认
    assert.equal(getPhoneHostExtensionId(), DEFAULT_PHONE_HOST_EXTENSION_ID);
    assert.equal(
      getOpenPhoneActionId(),
      `${DEFAULT_PHONE_HOST_EXTENSION_ID}.open-phone`,
    );
  });
});
