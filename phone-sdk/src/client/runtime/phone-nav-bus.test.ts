/**
 * @file phone-nav-bus.test.ts
 * @description 导航总线单元测试：publish/subscribe 回放、closed waiters 唤醒。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.5.0
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { PHONE_SDK_GLOBAL_KEY, getPhoneSdkSlot } from "./slot.ts";
import {
  publishPhoneNavigate,
  subscribePhoneNavigate,
  clearPhoneNavigatePending,
  emitPhoneClosed,
  waitForPhoneClosed,
  getLatestPhoneNavigate,
} from "./phone-nav-bus.ts";

describe("phone-nav-bus", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("publish 后 subscribe 收到最新 pending", () => {
    publishPhoneNavigate({ appId: "chat", seq: 1 });
    const received: unknown[] = [];
    const unsub = subscribePhoneNavigate((req) => received.push(req));
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], { appId: "chat", seq: 1 });
    unsub();
  });

  it("subscribe 后再 publish 实时收到", () => {
    const received: unknown[] = [];
    const unsub = subscribePhoneNavigate((req) => received.push(req));
    publishPhoneNavigate({ appId: "mail", seq: 2 });
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], { appId: "mail", seq: 2 });
    unsub();
  });

  it("后到的 publish 覆盖 pending（仅保留最新）", () => {
    publishPhoneNavigate({ appId: "a", seq: 1 });
    publishPhoneNavigate({ appId: "b", seq: 2 });
    const received: unknown[] = [];
    const unsub = subscribePhoneNavigate((req) => received.push(req));
    assert.equal(received.length, 1);
    assert.deepEqual(received[0], { appId: "b", seq: 2 });
    assert.deepEqual(getLatestPhoneNavigate(), { appId: "b", seq: 2 });
    unsub();
  });

  it("无 pending 时 subscribe 不回放", () => {
    const received: unknown[] = [];
    const unsub = subscribePhoneNavigate((req) => received.push(req));
    assert.equal(received.length, 0);
    unsub();
  });

  it("unsubscribe 后不再收到", () => {
    const received: unknown[] = [];
    const unsub = subscribePhoneNavigate((req) => received.push(req));
    unsub();
    publishPhoneNavigate({ appId: "x", seq: 9 });
    assert.equal(received.length, 0);
  });

  it("waitForPhoneClosed 在 emitPhoneClosed 后 resolve", async () => {
    let resolved = false;
    const p = waitForPhoneClosed().then(() => {
      resolved = true;
    });
    emitPhoneClosed();
    await p;
    assert.equal(resolved, true);
  });

  it("多次 waiter 一并唤醒", async () => {
    let done = 0;
    const p1 = waitForPhoneClosed().then(() => {
      done++;
    });
    const p2 = waitForPhoneClosed().then(() => {
      done++;
    });
    const p3 = waitForPhoneClosed().then(() => {
      done++;
    });
    emitPhoneClosed();
    await Promise.all([p1, p2, p3]);
    assert.equal(done, 3);
  });

  it("flow signal 取消等待并移除 waiter", async () => {
    const controller = new AbortController();
    const waiting = waitForPhoneClosed(controller.signal);
    assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size, 1);
    controller.abort();
    await waiting;
    assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size, 0);
  });

  it("已取消的 signal 立即返回且不注册 waiter", async () => {
    const controller = new AbortController();
    controller.abort();
    await waitForPhoneClosed(controller.signal);
    assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size ?? 0, 0);
  });

  it("getLatestPhoneNavigate 无 pending 时为 null", () => {
    assert.equal(getLatestPhoneNavigate(), null);
  });

  it("clearPhoneNavigatePending 后 getLatestPhoneNavigate 为 null 且新 subscribe 不回放", () => {
    publishPhoneNavigate({ appId: "chat", seq: 1 });
    clearPhoneNavigatePending();
    assert.equal(getLatestPhoneNavigate(), null);
    const received: unknown[] = [];
    const unsub = subscribePhoneNavigate((req) => received.push(req));
    assert.equal(received.length, 0);
    unsub();
  });

  it("emitPhoneClosed 清除 pending navigate", () => {
    publishPhoneNavigate({ appId: "chat", seq: 1 });
    emitPhoneClosed();
    assert.equal(getLatestPhoneNavigate(), null);
    const received: unknown[] = [];
    const unsub = subscribePhoneNavigate((req) => received.push(req));
    assert.equal(received.length, 0);
    unsub();
  });

  it("带 payload 的 navigate 请求被正确传递", () => {
    publishPhoneNavigate({ appId: "chat", payload: { deep: 1 }, seq: 5 });
    const received: unknown[] = [];
    const unsub = subscribePhoneNavigate((req) => received.push(req));
    assert.deepEqual(received[0], { appId: "chat", payload: { deep: 1 }, seq: 5 });
    assert.deepEqual(getLatestPhoneNavigate(), {
      appId: "chat",
      payload: { deep: 1 },
      seq: 5,
    });
    unsub();
  });
});
