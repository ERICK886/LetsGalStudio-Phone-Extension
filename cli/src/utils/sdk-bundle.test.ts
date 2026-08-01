/**
 * @file sdk-bundle.test.ts
 * @description 脚手架捆绑 @avg-studio/sdk 路径解析与拷贝单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  resolveBundledAvgStudioSdkDir,
  copyBundledAvgStudioSdk,
} from "./sdk-bundle.ts";

describe("resolveBundledAvgStudioSdkDir", () => {
  it("应解析到含 @avg-studio/sdk package.json 的目录", () => {
    const dir = resolveBundledAvgStudioSdkDir();
    assert.notEqual(dir, null);
    const pkg = JSON.parse(readFileSync(join(dir!, "package.json"), "utf8")) as {
      name?: string;
    };
    assert.equal(pkg.name, "@avg-studio/sdk");
  });
});

describe("copyBundledAvgStudioSdk", () => {
  let destRoot: string;

  before(() => {
    destRoot = mkdtempSync(join(tmpdir(), "sdk-bundle-"));
  });

  after(() => {
    rmSync(destRoot, { recursive: true, force: true });
  });

  it("拷贝到 dest/sdk 且 package.json name 正确", async () => {
    const written = await copyBundledAvgStudioSdk(destRoot);
    assert.ok(written.length > 0);
    assert.equal(existsSync(join(destRoot, "sdk", "package.json")), true);
    const pkg = JSON.parse(
      readFileSync(join(destRoot, "sdk", "package.json"), "utf8"),
    ) as { name?: string };
    assert.equal(pkg.name, "@avg-studio/sdk");
  });
});
