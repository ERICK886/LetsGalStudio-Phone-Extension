/**
 * @file names.test.ts
 * @description names 工具单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  toPascalCase,
  toRegisterFnName,
  toPackageName,
  toExtensionId,
} from "./names.ts";

describe("names", () => {
  it("toPascalCase: demo-shop → DemoShop", () => {
    assert.equal(toPascalCase("demo-shop"), "DemoShop");
  });

  it("toRegisterFnName: demo-shop → registerDemoShopPhoneApp", () => {
    assert.equal(toRegisterFnName("demo-shop"), "registerDemoShopPhoneApp");
  });

  it("toPackageName / toExtensionId", () => {
    assert.equal(toPackageName("demo-shop"), "phone-app-demo-shop");
    assert.equal(toExtensionId("demo-shop"), "ink.zenly.phone-app-demo-shop");
  });
});
