/**
 * @file phone-navigation-lifecycle.test.ts
 * @description 手机打开生命周期的异步回归测试。
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolvePhoneOpenLifecycle,
  shouldAnimatePhoneClose,
} from "./phone-navigation-lifecycle.ts";

describe("phone-navigation lifecycle", () => {
  it("手机关闭动画默认开启，并允许调用方显式关闭", () => {
    assert.equal(shouldAnimatePhoneClose(undefined), true);
    assert.equal(shouldAnimatePhoneClose(true), true);
    assert.equal(shouldAnimatePhoneClose(false), false);
  });

  it('waitUntil: "none" 不等待显示或关闭 Promise', async () => {
    const neverSettles = new Promise<never>(() => undefined);
    const result = await Promise.race([
      resolvePhoneOpenLifecycle(
        "none",
        () => neverSettles,
        neverSettles,
      ),
      new Promise<"timed-out">((resolve) => {
        setTimeout(() => resolve("timed-out"), 50);
      }),
    ]);

    assert.equal(result, "opened");
  });

  it("等待关闭时由关闭事件返回 opened", async () => {
    const result = await resolvePhoneOpenLifecycle(
      "close",
      async () => undefined,
      new Promise<never>(() => undefined),
    );
    assert.equal(result, "opened");
  });

  it("等待关闭时可由异步显示异常返回 failed", async () => {
    const result = await resolvePhoneOpenLifecycle(
      "close",
      () => new Promise<never>(() => undefined),
      Promise.resolve("failed"),
    );
    assert.equal(result, "failed");
  });
});
