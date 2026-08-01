/**
 * @file early-validate.test.ts
 * @description runAdd / runCreate 在交互前校验 CLI 传入的 app-id。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runAdd } from "./add.ts";
import { runCreate } from "./create.ts";

describe("runAdd 提前校验 app-id", () => {
  it("非法 app-id 在交互前即抛出", async () => {
    await assert.rejects(
      () => runAdd({ appId: "Bad_Id" }),
      /非法 app-id「Bad_Id」/,
    );
  });

  it("非法 app-id 带 title 仍提前抛出", async () => {
    await assert.rejects(
      () => runAdd({ appId: "Bad_Id", title: "x" }),
      /非法 app-id「Bad_Id」/,
    );
  });
});

describe("runCreate 提前校验 app-id", () => {
  it("非法 app-id 在交互前即抛出", async () => {
    await assert.rejects(
      () => runCreate({ appId: "Bad_Id", dir: "./x", title: "x" }),
      /非法 app-id「Bad_Id」/,
    );
  });
});
