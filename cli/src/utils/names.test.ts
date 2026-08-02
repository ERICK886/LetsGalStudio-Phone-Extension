/**
 * @file names.test.ts
 * @description names 工具单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.2
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  toPascalCase,
  toRegisterFnName,
  toPackageName,
} from "./names.ts";

describe("names", () => {
  it("toPascalCase: demo-shop → DemoShop", () => {
    assert.equal(toPascalCase("demo-shop"), "DemoShop");
  });

  it("toRegisterFnName: demo-shop → registerDemoShopPhoneApp", () => {
    assert.equal(toRegisterFnName("demo-shop"), "registerDemoShopPhoneApp");
  });

  it("toPackageName：与用户 extension-id 对齐（小写）", () => {
    assert.equal(toPackageName("demo-shop"), "demo-shop");
    assert.equal(toPackageName("com.acme.My-Phone"), "com.acme.my-phone");
  });
});
