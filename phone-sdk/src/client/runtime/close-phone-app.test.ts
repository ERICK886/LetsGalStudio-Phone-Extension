/**
 * @file close-phone-app.test.ts
 * @description closePhoneApp 无宿主时不卡死，有宿主时委托 navigation。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.5.1
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { PHONE_SDK_GLOBAL_KEY, getPhoneSdkSlot } from "./slot.ts";
import { closePhoneApp } from "./close-phone-app.ts";

describe("closePhoneApp", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("resolves when navigation host missing", async () => {
    await closePhoneApp();
  });

  it("delegates to slot.navigation.closePhoneApp", async () => {
    let called = 0;
    getPhoneSdkSlot().navigation = {
      async openPhoneApp() {},
      async closePhoneApp() {
        called += 1;
      },
    };
    await closePhoneApp();
    assert.equal(called, 1);
  });
});
