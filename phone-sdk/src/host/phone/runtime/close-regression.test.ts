import assert from "node:assert/strict";
import { beforeEach, it } from "node:test";
import type { ExtensionContext } from "@avg-studio/sdk";
import { createAnimatedClose } from "./animated-close.ts";
import { createNavigationController } from "./navigation-controller.ts";
import { installNavigationBinding } from "./navigation-binding.ts";
import { getPhoneSdkSlot, PHONE_SDK_GLOBAL_KEY } from "../../../client/runtime/slot.ts";
import { emitPhoneClosed } from "../../../client/runtime/phone-nav-bus.ts";

beforeEach(() => { delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY]; });

function harness(show: () => Promise<void> | void = () => undefined) {
  const flow = new AbortController();
  let visible = false;
  let hide = async () => { visible = false; };
  const ctx = { flow: { signal: flow.signal }, ui: {
    isVisible: () => visible,
    show: () => { visible = true; return show(); },
  } } as unknown as ExtensionContext;
  const controller = createNavigationController(ctx, flow.signal, {
    getState: () => ({ phoneMounted: true, storyMessageSessionVisible: false }),
    activate: () => undefined,
    hide: () => hide(),
  });
  return { controller, flow, setHide: (fn: () => Promise<void>) => { hide = fn; } };
}

it("animated close waits for async hide, even if hide synchronously unmounts the UI", async () => {
  let hidden: () => void = () => undefined;
  const hiding = new Promise<void>((resolve) => { hidden = resolve; });
  const task = createAnimatedClose(() => { task.dispose(); return hiding; }, 0);
  assert.equal(task.isHiding(), false);
  let completed = false;
  void task.promise.then(() => { completed = true; });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(task.isHiding(), true);
  assert.equal(completed, false);
  hidden();
  await task.promise;
  assert.equal(task.isHiding(), false);
  assert.equal(completed, true);
});

it("unmount during animation settles the close without invoking the stale callback", async () => {
  let calls = 0;
  const task = createAnimatedClose(() => { calls++; }, 100);
  const rejected = assert.rejects(task.promise, /interrupted/);
  task.dispose();
  task.dispose();
  await rejected;
  assert.equal(calls, 0);
});

it("failed show removes its close waiter", async () => {
  const { controller } = harness(() => Promise.reject(new Error("show failed")));
  assert.equal(await controller.openPhoneApp({ appId: "shop" }), "failed");
  assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size, 0);
});

it("subscribes before a synchronous close during show", async () => {
  const { controller } = harness(() => emitPhoneClosed());
  assert.equal(await controller.openPhoneApp({ appId: "shop" }), "opened");
});

it("none never waits for a long-lived ui.show promise", async () => {
  const { controller } = harness(() => new Promise(() => undefined));
  assert.equal(await controller.openPhoneApp({ appId: "shop", waitUntil: "none" }), "opened");
  assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size ?? 0, 0);
});

it("immediate close waits for hiding before releasing open waiters", async () => {
  const { controller, setHide } = harness();
  let hidden: () => void = () => undefined;
  setHide(() => new Promise<void>((resolve) => { hidden = resolve; }));
  const opened = controller.openPhoneApp({ appId: "shop" });
  const closing = controller.closePhoneApp({ animated: false });
  assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size, 1);
  hidden();
  await closing;
  assert.equal(await opened, "opened");
  assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size, 0);
});

it("old navigation cleanup preserves a newer binding, abort releases old waits", async () => {
  const first = harness();
  const second = harness();
  const oldDispose = installNavigationBinding(first.controller);
  const waiting = first.controller.openPhoneApp({ appId: "shop" });
  const dispose = installNavigationBinding(second.controller);
  first.flow.abort();
  oldDispose();
  await waiting;
  assert.equal(getPhoneSdkSlot().navigation, second.controller);
  assert.equal(await first.controller.openPhoneApp({ appId: "shop" }), "unavailable");
  dispose();
  assert.equal(getPhoneSdkSlot().navigation, undefined);
});

it("closing an older Preview cannot clear newer navigation or resolve its waiter", async () => {
  const first = harness(), second = harness();
  const oldWaiting = first.controller.openPhoneApp({ appId: "old" });
  const newWaiting = second.controller.openPhoneApp({ appId: "new" });
  await first.controller.closePhoneApp({ animated: false });
  await oldWaiting;
  assert.equal(getPhoneSdkSlot().phoneNavigatePending?.appId, "new");
  assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size, 1);
  await second.controller.closePhoneApp({ animated: false });
  await newWaiting;
  assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size, 0);
});

it("hide failure rejects close while releasing its navigation waiter", async () => {
  const { controller, setHide } = harness();
  setHide(async () => { throw new Error("hide failed"); });
  const waiting = controller.openPhoneApp({ appId: "shop" });
  await assert.rejects(controller.closePhoneApp({ animated: false }), /hide failed/);
  await waiting;
  assert.equal(getPhoneSdkSlot().phoneClosedWaiters?.size, 0);
});
