import assert from "node:assert/strict";
import { beforeEach, it } from "node:test";
import type { ExtensionContext } from "@avg-studio/sdk";
import { bindPhoneAppSettings, getPhoneAppSettings, type PhoneAppSettingsAccess } from "./app-settings.ts";
import { registerPhonePlugin } from "../bootstrap/register-plugin.ts";
import { registerPhoneApp } from "./register.ts";
import { PHONE_SDK_GLOBAL_KEY } from "./slot.ts";
import { readModuleSetting, writeModuleSetting } from "../../host/editor/schema/section-settings-bridge.ts";

beforeEach(() => { delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY]; });
const register = () => registerPhonePlugin({ extensionId: "independent.app", apps: [() => { registerPhoneApp({ id: "notes", render: () => null }); }] });

it("独立软件读写自身设置，注册/重装不重置既有值，也不写到手机宿主", () => {
  const data: Record<string, unknown> = { title: "旧设置", enabled: false, count: 0, entries: [{ id: "old" }] };
  const access: PhoneAppSettingsAccess = { get: (key) => data[key], set: (key, value) => { data[key] = value; }, subscribe: () => () => {} };
  let hostWrites = 0;
  const ctx = { settings: { cross: { get: () => "错误命名空间", set: () => { hostWrites++; } } } } as unknown as ExtensionContext;
  const dispose = register();
  // 尚无自身设置桥，禁止写宿主。
  assert.equal(writeModuleSetting(ctx, "notes", "title", "bad"), false);
  bindPhoneAppSettings("independent.app/notes", access);
  assert.equal(readModuleSetting(ctx, "notes", "title"), "旧设置");
  assert.equal(readModuleSetting(ctx, "notes", "enabled"), false);
  assert.equal(readModuleSetting(ctx, "notes", "count"), 0);
  assert.equal(writeModuleSetting(ctx, "notes", "title", "新设置"), true);
  register(); dispose();
  assert.deepEqual(data, { title: "新设置", enabled: false, count: 0, entries: [{ id: "old" }] });
  assert.equal(hostWrites, 0);
});

it("旧上下文 abort 不删除新桥，新上下文退出后恢复仍活跃的桥", () => {
  register();
  const first = new AbortController();
  const second = new AbortController();
  const make = (value: string): PhoneAppSettingsAccess => ({ get: () => value, set: () => {}, subscribe: () => () => {} });
  bindPhoneAppSettings("independent.app/notes", make("first"), first.signal);
  bindPhoneAppSettings("independent.app/notes", make("second"), second.signal);
  second.abort();
  assert.equal(getPhoneAppSettings("notes")?.get("title"), "first");
  bindPhoneAppSettings("independent.app/notes", make("third"));
  first.abort();
  assert.equal(getPhoneAppSettings("notes")?.get("title"), "third");
  assert.equal(getPhoneAppSettings("wrong.owner/notes"), undefined);
});
