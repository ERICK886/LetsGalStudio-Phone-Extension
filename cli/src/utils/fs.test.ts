/**
 * @file fs.test.ts
 * @description 仓库根探测与非空目录判断单测。
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
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { isDirectoryNonEmpty, findHostRepoRoot } from "./fs.ts";

/** 当前 worktree 根目录（cli/src/utils 上溯三级） */
const WORKTREE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);

describe("isDirectoryNonEmpty", () => {
  let emptyDir: string;
  let nonEmptyDir: string;
  let missingDir: string;

  before(() => {
    emptyDir = mkdtempSync(join(tmpdir(), "fs-empty-"));
    nonEmptyDir = mkdtempSync(join(tmpdir(), "fs-nonempty-"));
    writeFileSync(join(nonEmptyDir, "a.txt"), "x");
    missingDir = join(tmpdir(), "fs-missing-not-created");
  });

  after(() => {
    rmSync(emptyDir, { recursive: true, force: true });
    rmSync(nonEmptyDir, { recursive: true, force: true });
  });

  it("空目录 → false", () => {
    assert.equal(isDirectoryNonEmpty(emptyDir), false);
  });

  it("含文件 → true", () => {
    assert.equal(isDirectoryNonEmpty(nonEmptyDir), true);
  });

  it("不存在 → false", () => {
    assert.equal(isDirectoryNonEmpty(missingDir), false);
  });
});

describe("findHostRepoRoot", () => {
  it("从 cli 子目录向上应命中 worktree 根", () => {
    const startDir = join(WORKTREE_ROOT, "cli", "src", "utils");
    const root = findHostRepoRoot(startDir);
    assert.notEqual(root, null);
    assert.equal(root, WORKTREE_ROOT);
  });

  it("从 worktree 根本身应命中", () => {
    const root = findHostRepoRoot(WORKTREE_ROOT);
    assert.notEqual(root, null);
    assert.equal(root, WORKTREE_ROOT);
  });

  it("临时目录无宿主结构 → null", () => {
    const tmp = mkdtempSync(join(tmpdir(), "fs-nohost-"));
    try {
      assert.equal(findHostRepoRoot(tmp), null);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
