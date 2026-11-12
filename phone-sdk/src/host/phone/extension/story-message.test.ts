import assert from "node:assert/strict";
import { it } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readFileSync } from "node:fs";
import type { ExtensionContext } from "@avg-studio/sdk";

// 只加载本测试用到的真实 SDK 实现；SDK 总入口另有既存的 extension-inspector 缺文件。
const sdkRoot = new URL("../../../../../sdk/", import.meta.url);
const sdkModules = ["extension-module", "extension-method", "extension-settings", "extension-decorator", "save-schema", "sdk-context", "hooks/index", "types/index", "internal-actions", "internal-system-slots"];
const require = createRequire(import.meta.url);
const { build } = require(require.resolve("esbuild", { paths: [require.resolve("vite")] })) as {
  build(options: object): Promise<{ outputFiles: Array<{ text: string }> }>;
};
type BuildApi = {
  onResolve(options: { filter: RegExp }, callback: (args: { path: string; resolveDir: string }) => object): void;
  onLoad(options: { filter: RegExp; namespace?: string }, callback: (args: { path: string }) => object): void;
};
const compiled = await build({
  entryPoints: [fileURLToPath(new URL("./phone-extension.tsx", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "cjs", target: "es2020",
  tsconfig: fileURLToPath(new URL("../../../../../tsconfig.json", import.meta.url)),
  plugins: [{ name: "phone-runtime-test-inputs", setup(api: BuildApi) {
    api.onResolve({ filter: /^@avg-studio\/sdk$/ }, () => ({ path: "sdk", namespace: "test-sdk" }));
    api.onLoad({ filter: /.*/, namespace: "test-sdk" }, () => ({
      contents: sdkModules.map(name => `export * from ${JSON.stringify(fileURLToPath(new URL(`${name}.ts`, sdkRoot)))};`).join("\n"),
      resolveDir: fileURLToPath(sdkRoot), loader: "ts",
    }));
    api.onResolve({ filter: /\.css(?:\?(?:raw|inline))?$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.replace(/\?(?:raw|inline)$/, "")), namespace: "test-css" }));
    api.onLoad({ filter: /.*/, namespace: "test-css" }, args => ({ contents: readFileSync(args.path, "utf8"), loader: "text" }));
  } }],
});
const compiledModule = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(require, compiledModule, compiledModule.exports);
const { PhoneExtension, getPhoneRuntime } = compiledModule.exports as typeof import("./phone-extension.tsx");

function harness(longLivedShow = false, dockEnabled = false) {
  const cycle = new AbortController();
  let visible = false;
  let shows = 0;
  let hideFinish: (() => void) | undefined;
  const ctx = {
    flow: { signal: cycle.signal },
    getHost: () => ({}),
    settings: {
      get: (key: string) => key === "chatRolePresets" ? [{ id: "alice", characterId: "alice" }] : key === "showPhoneHudButton" ? dockEnabled : undefined,
      subscribe: () => () => {},
    },
    input: { registerAction: () => {}, onAction: () => () => {} },
    subscribe: () => () => {},
    ui: {
      isVisible: () => visible,
      show: (name: string) => {
        if (name !== "phone") return;
        shows++;
        visible = true;
        getPhoneRuntime(ctx).storyMessageListeners.add(() => {});
        return longLivedShow ? new Promise<void>(() => {}) : undefined;
      },
      hide: (name: string) => name === "phone" ? new Promise<void>(resolve => {
        hideFinish = () => { visible = false; getPhoneRuntime(ctx).storyMessageListeners.clear(); resolve(); };
      }) : Promise.resolve(),
    },
  } as unknown as ExtensionContext;
  const instance = new PhoneExtension();
  instance.__attachHost({ id: "test", context: ctx, close: () => {} });
  const runtime = getPhoneRuntime(ctx);
  runtime.phoneMounted = true;
  return { ctx, instance, runtime, cycle, shows: () => shows, finishHide: () => hideFinish?.() };
}

it("closing story group waits for hide before starting the next group; long-lived show never reopens old content", async () => {
  const h = harness(true);
  const params = { presetId: "alice", message: "第一组", closeAfterMessages: true };
  const first = PhoneExtension.showMessage.run.call(h.instance, h.ctx, params as never);
  await new Promise(resolve => setTimeout(resolve, 20));
  const second = PhoneExtension.showMessage.run.call(h.instance, h.ctx, { ...params, message: "第二组" } as never);
  const closing = h.instance.render().props.closePhone();
  assert.equal(h.shows(), 1);
  h.finishHide();
  await closing;
  await first;
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(h.shows(), 2);
  assert.deepEqual(h.runtime.activeStoryMessages.map(m => m.message), ["第二组"]);
  const finalClose = h.instance.render().props.closePhone();
  h.finishHide();
  await finalClose;
  await second;
  assert.equal(h.shows(), 2);
  assert.equal(h.runtime.pendingStorySequence, undefined);
});

it("flow abort settles an active story sequence without requiring another click", async () => {
  const h = harness(true);
  PhoneExtension.onRegister(h.ctx);
  const pending = PhoneExtension.showMessage.run.call(h.instance, h.ctx, { presetId: "alice", message: "消息" } as never);
  h.cycle.abort();
  await pending;
  assert.equal(h.runtime.pendingStorySequence, undefined);
  assert.equal(h.runtime.storyMessageSessionVisible, false);
});

it("HUD, manual reopen and story messages reuse the same mounted phone", async () => {
  const h = harness(true, true);
  PhoneExtension.onRegister(h.ctx);
  assert.equal(h.shows(), 1);
  assert.equal(h.runtime.presentation.getSnapshot(), "docked");
  h.runtime.openPhoneFromHud?.();
  assert.equal(h.runtime.presentation.getSnapshot(), "open");
  assert.equal(h.shows(), 1);
  await h.instance.render().props.closePhone();
  assert.equal(h.ctx.ui.isVisible("phone"), true);
  assert.equal(h.runtime.presentation.getSnapshot(), "docked");
  const story = PhoneExtension.showMessage.run.call(h.instance, h.ctx, { presetId: "alice", message: "常驻手机里的消息" } as never);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(h.runtime.presentation.getSnapshot(), "open");
  assert.equal(h.shows(), 1);
  await h.instance.render().props.closePhone();
  await story;
  assert.equal(h.runtime.presentation.getSnapshot(), "docked");
  h.runtime.openPhoneFromHud?.();
  assert.equal(h.runtime.presentation.getSnapshot(), "open");
  assert.equal(h.shows(), 1);
  h.cycle.abort();
});
