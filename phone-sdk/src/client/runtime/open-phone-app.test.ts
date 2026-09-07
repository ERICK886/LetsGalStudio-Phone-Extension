/**
 * @file open-phone-app.test.ts
 * @description openPhoneApp 无宿主时不卡死。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.5.0
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { PHONE_SDK_GLOBAL_KEY, getPhoneSdkSlot } from "./slot.ts";
import { openPhoneApp } from "./open-phone-app.ts";

describe("openPhoneApp", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("resolves when navigation host missing", async () => {
    assert.equal(await openPhoneApp({ appId: "chat" }), "unavailable");
  });

  it("returns invalid for an empty app id", async () => {
    assert.equal(await openPhoneApp({ appId: "  " }), "invalid");
  });

  it("delegates to slot.navigation", async () => {
    const calls: unknown[] = [];
    getPhoneSdkSlot().navigation = {
      async openPhoneApp(options) {
        calls.push(options);
      },
      async closePhoneApp() {},
    };
    assert.equal(
      await openPhoneApp({ appId: "chat", waitUntil: "none" }),
      "opened",
    );
    assert.deepEqual(calls, [{ appId: "chat", waitUntil: "none" }]);
  });

  it("preserves a host rejection result", async () => {
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {
        return "blocked";
      },
      async closePhoneApp() {},
    };
    assert.equal(await openPhoneApp({ appId: "chat" }), "blocked");
  });
});
