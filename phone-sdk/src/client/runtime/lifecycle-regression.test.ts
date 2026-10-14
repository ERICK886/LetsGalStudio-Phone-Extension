import assert from "node:assert/strict";
import { beforeEach, it } from "node:test";
import { getPhoneSdkSlot, PHONE_SDK_GLOBAL_KEY } from "./slot.ts";
import { registerPhoneApp, unregisterPhoneApp } from "./register.ts";
import { installPhoneSdkHost } from "./host.ts";
import { acquirePhoneCloseLock, clearPhoneCloseLocks, isPhoneCloseLocked, subscribePhoneCloseLock } from "./phone-close-lock.ts";
import { publishPhoneNavigate, subscribePhoneNavigate } from "./phone-nav-bus.ts";
import { bootstrapPhonePluginApps } from "../bootstrap/bootstrap.ts";
import type { PhoneAppRegistration } from "./types.ts";

beforeEach(() => { delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY]; });

it("late host honors the last register after an unregister", () => {
  registerPhoneApp({ id: "shop", title: "old", render: () => null });
  unregisterPhoneApp("shop");
  registerPhoneApp({ id: "shop", title: "new", render: () => null });
  const apps = new Map<string, PhoneAppRegistration>();
  installPhoneSdkHost({
    registerApp: (app) => { apps.set(app.id, app); },
    unregisterApp: (id) => { apps.delete(id); },
    getApp: (id) => apps.get(id), listApps: () => [...apps.values()],
  });
  assert.equal(apps.get("shop")?.title, "new");
  unregisterPhoneApp("shop");
  assert.equal(apps.has("shop"), false);
});

it("throwing lock listeners cannot trap a lock or prevent subsequent notifications", () => {
  const off = subscribePhoneCloseLock(() => { throw new Error("probe"); });
  const observed: boolean[] = [];
  subscribePhoneCloseLock(() => observed.push(isPhoneCloseLocked()));
  const release = acquirePhoneCloseLock();
  release();
  release();
  acquirePhoneCloseLock();
  clearPhoneCloseLocks();
  assert.deepEqual(observed, [true, false, true, false]);
  assert.equal(isPhoneCloseLocked(), false);
  off();
});

it("navigation isolates publication and pending replay failures and returns a disposer", () => {
  publishPhoneNavigate({ appId: "shop", seq: 1 });
  const off = subscribePhoneNavigate(() => { throw new Error("probe"); });
  const received: number[] = [];
  subscribePhoneNavigate((request) => received.push(request.seq));
  publishPhoneNavigate({ appId: "shop", seq: 2 });
  off();
  assert.equal(getPhoneSdkSlot().phoneNavigateListeners?.size, 1);
  assert.deepEqual(received, [1, 2]);
});

it("registration preserves character controls and phone-call previews", () => {
  registerPhoneApp({ id: "phone-probe", render: () => null, styleEditor: {
    pages: [{ id: "call", label: "Call", preview: "phone-call" }],
    contentItems: [{ id: "caller", group: "Call", label: "Caller", fieldType: "character", defaultValue: "alice" }],
  } });
  const editor = getPhoneSdkSlot().queue[0].styleEditor;
  assert.equal(editor?.pages?.[0].preview, "phone-call");
  assert.equal(editor?.contentItems?.[0].fieldType, "character");
});

it("bootstrap retains different bundles and old cleanup cannot erase an HMR replacement", () => {
  const calls: string[] = [];
  const old = bootstrapPhonePluginApps(() => calls.push("old"), "a");
  bootstrapPhonePluginApps(() => calls.push("b"), "b");
  const current = bootstrapPhonePluginApps(() => calls.push("new"), "a");
  old();
  calls.length = 0;
  getPhoneSdkSlot().pluginDevReregister?.();
  assert.deepEqual(calls, ["new", "b"]);
  current();
  calls.length = 0;
  getPhoneSdkSlot().pluginDevReregister?.();
  assert.deepEqual(calls, ["b"]);
});

it("bootstrap ownership distinguishes repeated registration of the same function", () => {
  let calls = 0;
  const register = () => { calls++; };
  const old = bootstrapPhonePluginApps(register, "same-bundle");
  bootstrapPhonePluginApps(register, "same-bundle");
  old();
  getPhoneSdkSlot().pluginDevReregister?.();
  assert.equal(calls, 3);
});
