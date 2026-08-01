/**
 * @file create-template-files.test.ts
 * @description 断言 create-host / pack-release 模板关键文件存在。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.0
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { TEMPLATES_DIR } from "../constants.ts";

/**
 * 宿主脚手架模板目录名。
 *
 * @constant
 */
const HOST_TEMPLATES = ["create-host-default", "create-host-minimal"] as const;

/**
 * 宿主脚手架要求的相对路径清单（内页由 add 模板单独拷贝）。
 *
 * @constant
 */
const HOST_REQUIRED = [
  ".gitignore",
  "extension.json",
  "package.json",
  "README.md",
  "tsconfig.json",
  "vite.config.ts",
  "src/index.tsx",
  "src/vite-env.d.ts",
] as const;

/**
 * pack-release 模板要求的相对路径清单。
 *
 * @constant
 */
const PACK_RELEASE_REQUIRED = [
  ".gitignore",
  "extension.json",
  "package.json",
  "README.md",
  "tsconfig.json",
  "vite.config.ts",
  "src/index.tsx",
  "src/vite-env.d.ts",
] as const;

describe("create-host 模板文件", () => {
  for (const name of HOST_TEMPLATES) {
    it(`${name} 含宿主脚手架关键文件`, () => {
      const root = join(TEMPLATES_DIR, name);

      for (const rel of HOST_REQUIRED) {
        assert.equal(
          existsSync(join(root, rel)),
          true,
          `缺少 ${name}/${rel}`,
        );
      }
    });
  }
});

describe("pack-release 模板文件", () => {
  it("含标准内页包骨架关键文件", () => {
    const root = join(TEMPLATES_DIR, "pack-release");

    for (const rel of PACK_RELEASE_REQUIRED) {
      assert.equal(
        existsSync(join(root, rel)),
        true,
        `缺少 pack-release/${rel}`,
      );
    }
  });
});
