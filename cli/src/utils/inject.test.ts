/**
 * @file inject.test.ts
 * @description injectPhoneAppRegistry 单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { injectPhoneAppRegistry } from "./inject.ts";

/** 与当前宿主 `src/index.tsx` 形态一致的夹具。 */
const FIXTURE = `import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";

bootstrapPhonePluginApps(
  definePhonePluginRegistry(
    registerDemoShopPhoneApp
  ),
);
`;

describe("injectPhoneAppRegistry", () => {
  it("注入 notes：追加相对 import 与 registry 参数", () => {
    const result = injectPhoneAppRegistry(FIXTURE, "notes");

    assert.match(result, /import \{ registerNotesPhoneApp \} from "\.\/notes";/);
    assert.ok(result.includes("registerDemoShopPhoneApp"));
    assert.ok(result.includes("registerNotesPhoneApp"));
    assert.match(
      result,
      /definePhonePluginRegistry\([\s\S]*registerDemoShopPhoneApp[\s\S]*registerNotesPhoneApp[\s\S]*\)/,
    );
  });

  it("无 definePhonePluginRegistry → 抛出中文 Error", () => {
    const source = `import { foo } from "./foo";\nbootstrapPhonePluginApps(foo);`;

    assert.throws(
      () => injectPhoneAppRegistry(source, "notes"),
      /definePhonePluginRegistry/,
    );
  });

  it("已存在 registerNotesPhoneApp → 不重复插入 import 与 registry", () => {
    const once = injectPhoneAppRegistry(FIXTURE, "notes");
    const twice = injectPhoneAppRegistry(once, "notes");

    assert.equal(twice, once);
    assert.equal(
      (twice.match(/import \{ registerNotesPhoneApp \} from "\.\/notes";/g) ?? [])
        .length,
      1,
    );
  });
});
