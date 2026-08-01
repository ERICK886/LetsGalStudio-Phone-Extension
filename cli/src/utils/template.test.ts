/**
 * @file template.test.ts
 * @description 模板渲染与目录拷贝单测。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  renderTemplateString,
  copyTemplateDir,
} from "./template.ts";

describe("renderTemplateString", () => {
  it("替换已知占位符：{{appId}}-{{title}} → a-T", () => {
    const result = renderTemplateString("{{appId}}-{{title}}", {
      appId: "a",
      title: "T",
    });
    assert.equal(result, "a-T");
  });

  it("未提供的 {{x}} 保持原样", () => {
    const result = renderTemplateString("hello {{x}} world", { appId: "a" });
    assert.equal(result, "hello {{x}} world");
  });
});

describe("copyTemplateDir", () => {
  let srcDir: string;
  let destDir: string;

  before(() => {
    srcDir = mkdtempSync(join(tmpdir(), "tpl-src-"));
    destDir = mkdtempSync(join(tmpdir(), "tpl-dest-"));

    mkdirSync(join(srcDir, "node_modules", "pkg"), { recursive: true });
    writeFileSync(join(srcDir, "node_modules", "pkg", "skip.js"), "skip");

    mkdirSync(join(srcDir, ".git"), { recursive: true });
    writeFileSync(join(srcDir, ".git", "HEAD"), "ref");

    writeFileSync(
      join(srcDir, "{{appId}}.ts"),
      "export const id = '{{appId}}';",
    );
    writeFileSync(join(srcDir, "readme.md"), "# {{title}}");
    writeFileSync(join(srcDir, "logo.bin"), "\x00\x01\x02{{appId}}");
  });

  after(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(destDir, { recursive: true, force: true });
  });

  it("递归拷贝、跳过 node_modules/.git、替换文本与文件名", async () => {
    const written = await copyTemplateDir(srcDir, destDir, {
      appId: "demo-shop",
      title: "Demo",
    });

    assert.deepEqual(written.sort(), ["demo-shop.ts", "logo.bin", "readme.md"]);

    assert.equal(
      readFileSync(join(destDir, "demo-shop.ts"), "utf8"),
      "export const id = 'demo-shop';",
    );
    assert.equal(readFileSync(join(destDir, "readme.md"), "utf8"), "# Demo");
    assert.equal(
      readFileSync(join(destDir, "logo.bin"), "binary").toString("binary"),
      "\x00\x01\x02{{appId}}",
    );

    assert.equal(existsSync(join(destDir, "node_modules")), false);
    assert.equal(existsSync(join(destDir, ".git")), false);
  });

  /**
   * 验证模板源文件 `gitignore` 在生成工程时重命名为 `.gitignore`。
   *
   * @remarks
   * npm pack 不会稳定带上包内模板的 `.gitignore`，故模板提交为 `gitignore`。
   */
  it("将模板文件 gitignore 重命名为 .gitignore", async () => {
    const src = mkdtempSync(join(tmpdir(), "tpl-gi-src-"));
    const dest = mkdtempSync(join(tmpdir(), "tpl-gi-dest-"));

    try {
      writeFileSync(join(src, "gitignore"), "node_modules\n");
      const written = await copyTemplateDir(src, dest, {});

      assert.equal(existsSync(join(dest, ".gitignore")), true);
      assert.equal(existsSync(join(dest, "gitignore")), false);
      assert.equal(
        readFileSync(join(dest, ".gitignore"), "utf8"),
        "node_modules\n",
      );
      assert.ok(written.includes(".gitignore"));
    } finally {
      rmSync(src, { recursive: true, force: true });
      rmSync(dest, { recursive: true, force: true });
    }
  });
});
