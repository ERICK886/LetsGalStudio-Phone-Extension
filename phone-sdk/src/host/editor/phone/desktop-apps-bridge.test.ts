/**
 * @file desktop-apps-bridge.test.ts
 * @description 桌面应用 id / 排序工具单测（不依赖 catalog 目录导入）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

function nextCatalogAppId(
  existing: ReadonlySet<string>,
  base = "new-app",
): string {
  if (!existing.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

describe("desktop-apps id helpers", () => {
  it("nextCatalogAppId avoids collisions", () => {
    const existing = new Set(["new-app", "new-app-2"]);
    assert.equal(nextCatalogAppId(existing), "new-app-3");
  });

  it("nextCatalogAppId returns base when free", () => {
    assert.equal(nextCatalogAppId(new Set()), "new-app");
  });
});
