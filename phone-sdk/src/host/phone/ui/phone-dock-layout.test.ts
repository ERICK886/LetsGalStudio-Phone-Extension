import assert from "node:assert/strict";
import { it } from "node:test";
import { computePhoneDockLayout } from "./phone-dock-layout.ts";

it("keeps just the configured strip inside the local host for every dock edge", () => {
  for (const stylePreset of ["apple", "android"] as const) {
    for (const [width, height] of [[1280, 720], [320, 480], [700, 240]]) {
      for (const dockPosition of ["bottom-left", "bottom-center", "bottom-right", "top-left", "top-center", "top-right", "middle-left", "middle-right"]) {
        const d = computePhoneDockLayout({ width, height, stylePreset, dockPosition, openPosition: "center" });
        const visibleWidth = Math.max(0, Math.min(width, d.dockX + d.fit.width * d.scale) - Math.max(0, d.dockX));
        const visibleHeight = Math.max(0, Math.min(height, d.dockY + d.fit.height * d.scale) - Math.max(0, d.dockY));
        assert.ok(Math.abs((dockPosition.startsWith("middle-") ? visibleWidth : visibleHeight) - d.peek) < 0.001);
        assert.ok(d.peek >= 24);
        assert.ok(Math.abs(d.fit.width / d.fit.height - (stylePreset === "apple" ? 0.5 : 400 / 760)) < 1e-10);
      }
    }
  }
});

it("shares one transform coordinate system across all expanded positions and bounds offsets", () => {
  for (const openPosition of ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right", "center"]) {
    const d = computePhoneDockLayout({ width: 1000, height: 800, stylePreset: "apple", openPosition, offsetX: 1000 });
    assert.ok(d.dockX >= 0 && d.dockX + d.fit.width * d.scale <= 1000);
    assert.ok(d.openX >= 20 && d.openY >= 20);
    assert.ok(!/NaN|Infinity/.test(d.transform));
  }
});

it("normalizes invalid settings without moving the whole phone back inside or losing the handle", () => {
  const d = computePhoneDockLayout({ width: 800, height: 600, stylePreset: "android", openPosition: "bottom-right", scale: "bad", peek: -500 });
  assert.equal(d.scale, 0.6);
  assert.equal(d.peek, 24);
  assert.equal(d.dockY, 576);
  assert.ok(!/NaN|Infinity/.test(computePhoneDockLayout({ width: 0, height: 0, stylePreset: "apple", openPosition: "center" }).transform));
});

it("defaults to the corresponding expanded edge, with a centered phone docking below", () => {
  for (const openPosition of ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right", "center"]) {
    const input = { width: 960, height: 540, stylePreset: "apple" as const, openPosition };
    const d = computePhoneDockLayout(input);
    assert.deepEqual(d, computePhoneDockLayout({ ...input, dockPosition: "follow-phone" }));
    if (openPosition.startsWith("top-")) assert.ok(Math.abs(d.dockY + d.fit.height * d.scale - 32) < 0.001);
    else assert.equal(d.dockY, 508);
  }
});
