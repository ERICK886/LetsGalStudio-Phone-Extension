import assert from "node:assert/strict";
import { beforeEach, it } from "node:test";
import type { ExtensionContext } from "@avg-studio/sdk";
import { registerPhoneRuntimeCycle } from "../index.ts";
import { getPhoneSdkSlot, PHONE_SDK_GLOBAL_KEY } from "./slot.ts";
import { createNavigationController } from "../../host/phone/runtime/navigation-controller.ts";
import { installNavigationBinding } from "../../host/phone/runtime/navigation-binding.ts";

beforeEach(() => { delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY]; });

function harness() {
  let cycle = new AbortController();
  const listeners = new Set<() => void>();
  const ctx = {
    flow: { get signal() { return cycle.signal; } },
    subscribe: (_event: string, listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    ui: { isVisible: () => false, show: () => undefined },
  } as unknown as ExtensionContext;
  const started = () => { for (const listener of [...listeners]) listener(); };
  return { ctx, listeners, started, next: () => { cycle.abort(); cycle = new AbortController(); started(); } };
}

it("reinstalls navigation after a new run without another Studio onRegister", async () => {
  const h = harness();
  let installs = 0, cleanups = 0;
  const dispose = registerPhoneRuntimeCycle(h.ctx, "phone", (signal) => {
    installs++;
    const uninstall = installNavigationBinding(createNavigationController(h.ctx, signal, {
      getState: () => ({ phoneMounted: true, storyMessageSessionVisible: false }),
      activate: () => undefined,
      hide: async () => undefined,
    }));
    return () => { cleanups++; uninstall(); };
  });
  const old = getPhoneSdkSlot().navigation!;
  assert.equal(await old.openPhoneApp({ appId: "phone-chat", waitUntil: "none" }), "opened");
  h.started();
  assert.equal(installs, 1);
  h.next();
  assert.equal(cleanups, 1);
  assert.equal(installs, 2);
  assert.equal(await old.openPhoneApp({ appId: "phone-chat" }), "unavailable");
  assert.equal(await getPhoneSdkSlot().navigation!.openPhoneApp({ appId: "phone-chat", waitUntil: "none" }), "opened");
  dispose();
  dispose();
  assert.equal(cleanups, 2);
  assert.equal(h.listeners.size, 0);
});

it("replaces a registration across wrappers and keeps an older disposer from removing the new one", () => {
  const h = harness();
  let oldCalls = 0, newCalls = 0;
  const oldDispose = registerPhoneRuntimeCycle(h.ctx, "chat", () => { oldCalls++; return () => {}; });
  const newDispose = registerPhoneRuntimeCycle({ ...h.ctx }, "chat", () => { newCalls++; return () => {}; });
  oldDispose();
  h.next();
  assert.equal(oldCalls, 1);
  assert.equal(newCalls, 2);
  assert.equal(h.listeners.size, 1);
  newDispose();
});
