import { matchesPhoneAppReference } from "./app-id.ts";
import { openPhoneApp } from "./open-phone-app.ts";
import assert from "node:assert/strict";
import { beforeEach, it } from "node:test";
import { registerPhonePlugin } from "../bootstrap/register-plugin.ts";
import { registerPhoneApp, unregisterPhoneApp, getRegisteredPhoneApp, listRegisteredPhoneApps } from "./register.ts";
import { getPhoneSdkSlot, PHONE_SDK_GLOBAL_KEY } from "./slot.ts";
import { parsePhoneAppRegistration } from "./parse-registration.ts";
import { resolvePhoneAppReference } from "./resolve-app.ts";
import { installPhoneExtensionSdkHost, lookupPhoneSdkApp } from "../../host/phone/runtime/install-host.ts";

beforeEach(() => { delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY]; });

it("解析保留来源，拒绝来源不一致；不修改输入或写入全局状态", () => {
  const original = { id: "owner.app/notes", render: () => null };
  const parsed = parsePhoneAppRegistration(original);
  assert.equal(parsed.app?.id, "notes");
  assert.equal(parsed.app?.extensionId, "owner.app");
  assert.equal(original.id, "owner.app/notes");
  assert.equal((globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY], undefined);
  assert.equal(parsePhoneAppRegistration({ ...original, extensionId: "other.app" }).app, null);
  assert.equal(parsePhoneAppRegistration({ id: "notes" }).issues[0]?.path, "render");
});

it("晚安装宿主、重装和带来源的查询保留同一应用，错误来源不能打开或注销", () => {
  registerPhonePlugin({ extensionId: "owner.app", apps: [() => { registerPhoneApp({ id: "notes", render: () => null }); }] });
  assert.equal(getPhoneSdkSlot().queue[0]?.extensionId, "owner.app");
  installPhoneExtensionSdkHost();
  assert.ok(getRegisteredPhoneApp("owner.app/notes"));
  assert.equal(getRegisteredPhoneApp("other.app/notes"), undefined);
  assert.equal(lookupPhoneSdkApp("other.app/notes"), undefined);
  unregisterPhoneApp("other.app/notes");
  assert.ok(getRegisteredPhoneApp("notes"));
  installPhoneExtensionSdkHost();
  assert.equal(listRegisteredPhoneApps().length, 1);
});

it("不同扩展的同名软件不能覆盖，旧 HMR 清理不能移除新软件", () => {
  installPhoneExtensionSdkHost();
  const old = registerPhonePlugin({ extensionId: "owner.app", apps: [() => { registerPhoneApp({ id: "notes", title: "old", render: () => null }); }] });
  const current = registerPhonePlugin({ extensionId: "owner.app", apps: [() => { registerPhoneApp({ id: "notes", title: "new", render: () => null }); }] });
  registerPhonePlugin({ extensionId: "other.app", apps: [() => { registerPhoneApp({ id: "notes", title: "wrong", render: () => null }); }] });
  old(); old();
  assert.equal(getRegisteredPhoneApp("notes")?.title, "new");
  current(); current();
  assert.equal(getRegisteredPhoneApp("notes"), undefined);
  installPhoneExtensionSdkHost();
  assert.equal(listRegisteredPhoneApps().some((app) => app.extensionId === "owner.app"), false);
});

it("直接注册返回所有者清理，队列中注册/注销/再注册时序正确", () => {
  const old = registerPhoneApp({ id: "legacy", title: "old", render: () => null });
  old();
  const latest = registerPhoneApp({ id: "legacy", title: "new", render: () => null });
  old();
  installPhoneExtensionSdkHost();
  assert.equal(getRegisteredPhoneApp("legacy")?.title, "new");
  assert.equal(resolvePhoneAppReference("any.owner/legacy", listRegisteredPhoneApps()).legacy, true);
  latest();
  assert.equal(getRegisteredPhoneApp("legacy"), undefined);
});

it("一个软件注册抛错不会阻断其余软件，卸载后不重新注册", () => {
  const dispose = registerPhonePlugin({ extensionId: "owner.app", apps: [
    () => { throw new Error("broken app"); },
    () => { registerPhoneApp({ id: "good", render: () => null }); },
  ] });
  assert.equal(listRegisteredPhoneApps()[0]?.id, "good");
  dispose();
  installPhoneExtensionSdkHost();
  assert.deepEqual(listRegisteredPhoneApps(), []);
});

it("完整引用导航保留来源，错误来源不交给导航，软件按来源消费 payload", async () => {
  registerPhonePlugin({ extensionId: "owner.app", apps: [() => { registerPhoneApp({ id: "notes", render: () => null }); }] });
  installPhoneExtensionSdkHost();
  const calls: string[] = [];
  getPhoneSdkSlot().navigation = { openPhoneApp: async (options) => { calls.push(options.appId); }, closePhoneApp: async () => {} };
  assert.equal(await openPhoneApp({ appId: "wrong.app/notes" }), "unavailable");
  assert.deepEqual(calls, []);
  assert.equal(await openPhoneApp({ appId: "owner.app/notes", waitUntil: "none" }), "opened");
  assert.deepEqual(calls, ["owner.app/notes"]);
  assert.equal(matchesPhoneAppReference("owner.app/notes", "notes", "owner.app"), true);
  assert.equal(matchesPhoneAppReference("notes", "notes", "owner.app"), true);
  assert.equal(matchesPhoneAppReference("wrong.app/notes", "notes", "owner.app"), false);
});
