/**
 * @file desktop-actions-bridge.test.ts
 * @description 动作目录 id / 默认草稿辅助单测。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * 与 bridge 中 nextCatalogActionId 保持同逻辑的本地副本（避免测试拉起整包依赖）。
 *
 * @param existing - 已有 id
 * @param base - 基础名
 * @returns 新 id
 */
function nextCatalogActionId(
  existing: ReadonlySet<string>,
  base = "new-action",
): string {
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

describe("desktop-actions id helpers", () => {
  it("nextCatalogActionId avoids collisions", () => {
    const existing = new Set(["new-system-ui", "new-system-ui-2"]);
    assert.equal(nextCatalogActionId(existing, "new-system-ui"), "new-system-ui-3");
  });

  it("nextCatalogActionId returns base when free", () => {
    assert.equal(nextCatalogActionId(new Set(), "new-program-ui"), "new-program-ui");
  });
});
