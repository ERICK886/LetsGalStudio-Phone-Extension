/**
 * @file phone-app-badge.test.ts
 * @description 桌面 APP 角标 store：set / clear / subscribe / 校验。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.5.4
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { PHONE_SDK_GLOBAL_KEY } from "./slot.ts";
import {
  clearPhoneAppBadge,
  formatPhoneAppBadgeLabel,
  getPhoneAppBadge,
  getPhoneAppBadges,
  setPhoneAppBadge,
  subscribePhoneAppBadges,
} from "./phone-app-badge.ts";

describe("phone-app-badge", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("set dot and get", () => {
    setPhoneAppBadge("chat", { mode: "dot" });
    assert.deepEqual(getPhoneAppBadge("chat"), { mode: "dot" });
  });

  it("set count and get", () => {
    setPhoneAppBadge("chat", { mode: "count", count: 3 });
    assert.deepEqual(getPhoneAppBadge("chat"), { mode: "count", count: 3 });
  });

  it("clear and null badge remove entry", () => {
    setPhoneAppBadge("chat", { mode: "count", count: 2 });
    clearPhoneAppBadge("chat");
    assert.equal(getPhoneAppBadge("chat"), null);
    setPhoneAppBadge("chat", { mode: "dot" });
    setPhoneAppBadge("chat", null);
    assert.equal(getPhoneAppBadge("chat"), null);
  });

  it("count < 1 or non-finite clears", () => {
    setPhoneAppBadge("chat", { mode: "count", count: 5 });
    setPhoneAppBadge("chat", { mode: "count", count: 0 });
    assert.equal(getPhoneAppBadge("chat"), null);
    setPhoneAppBadge("chat", { mode: "count", count: 2 });
    setPhoneAppBadge("chat", { mode: "count", count: Number.NaN });
    assert.equal(getPhoneAppBadge("chat"), null);
  });

  it("empty appId ignored", () => {
    setPhoneAppBadge("  ", { mode: "dot" });
    assert.equal(getPhoneAppBadges().size, 0);
  });

  it("subscribe notified on set and clear", () => {
    let n = 0;
    const unsub = subscribePhoneAppBadges(() => {
      n += 1;
    });
    setPhoneAppBadge("chat", { mode: "count", count: 1 });
    clearPhoneAppBadge("chat");
    unsub();
    setPhoneAppBadge("chat", { mode: "dot" });
    assert.equal(n, 2);
  });

  it("formatPhoneAppBadgeLabel", () => {
    assert.equal(formatPhoneAppBadgeLabel({ mode: "dot" }), "");
    assert.equal(formatPhoneAppBadgeLabel({ mode: "count", count: 3 }), "3");
    assert.equal(formatPhoneAppBadgeLabel({ mode: "count", count: 99 }), "99");
    assert.equal(formatPhoneAppBadgeLabel({ mode: "count", count: 100 }), "99+");
  });
});
