/**
 * @file phone-host-editor-schema.test.ts
 * @description 宿主手机编辑 schema 单测。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHONE_HOST_EDITOR_SCHEMA,
  defaultEditorPageId,
  resolvePageContentItems,
  sortEditorPages,
} from "./phone-host-editor-schema";

describe("PHONE_HOST_EDITOR_SCHEMA", () => {
  it("declares full section schema fields", () => {
    assert.equal(PHONE_HOST_EDITOR_SCHEMA.sectionId, "phone");
    assert.equal(PHONE_HOST_EDITOR_SCHEMA.settingsModuleId, "phone");
    assert.equal(PHONE_HOST_EDITOR_SCHEMA.contentItems.length, 19);
    assert.equal(PHONE_HOST_EDITOR_SCHEMA.pages.length, 7);
  });

  it("orders home-style first as ready desktop", () => {
    const sorted = sortEditorPages(PHONE_HOST_EDITOR_SCHEMA.pages);
    assert.equal(sorted[0]?.id, "home-style");
    assert.equal(sorted[0]?.status, "ready");
    assert.equal(sorted[0]?.preview, "desktop");
  });

  it("home-style excludes popup and shortcut fields", () => {
    const page = PHONE_HOST_EDITOR_SCHEMA.pages.find((p) => p.id === "home-style");
    const items = resolvePageContentItems(
      PHONE_HOST_EDITOR_SCHEMA,
      page?.contentItemIds,
    );
    assert.equal(items.length, 7);
    assert.equal(items[0]?.id, "phoneTitle");
    assert.ok(!items.some((item) => item.id === "popupPosition"));
    assert.ok(!items.some((item) => item.id === "openPhoneShortcut"));
  });

  it("popup-shortcut page is ready with two fields", () => {
    const page = PHONE_HOST_EDITOR_SCHEMA.pages.find(
      (p) => p.id === "popup-shortcut",
    );
    assert.equal(page?.status, "ready");
    assert.equal(page?.preview, "desktop");
    const items = resolvePageContentItems(
      PHONE_HOST_EDITOR_SCHEMA,
      page?.contentItemIds,
    );
    assert.deepEqual(
      items.map((item) => item.id),
      ["popupPosition", "openPhoneShortcut"],
    );
  });

  it("marks desktop-apps as ready", () => {
    const byId = new Map(
      PHONE_HOST_EDITOR_SCHEMA.pages.map((p) => [p.id, p]),
    );
    assert.equal(byId.get("desktop-apps")?.status, "ready");
    assert.equal(byId.get("desktop-apps")?.preview, "desktop");
  });

  it("phone-hud page exposes all touch entry controls", () => {
    const page = PHONE_HOST_EDITOR_SCHEMA.pages.find((p) => p.id === "phone-hud");
    const items = resolvePageContentItems(PHONE_HOST_EDITOR_SCHEMA, page?.contentItemIds);
    assert.equal(page?.status, "ready");
    assert.equal(page?.preview, "desktop");
    assert.deepEqual(items.map((item) => item.id), [
      "showPhoneHudButton",
      "phoneHudIcon",
      "phoneHudPosition",
      "phoneHudOffsetX",
      "phoneHudOffsetY",
      "phoneHudSize",
    ]);
    assert.equal(items.find((item) => item.id === "phoneHudPosition")?.enumOptions?.length, 8);
    assert.ok(items.filter((item) => item.fieldType === "number").length === 3);
  });

  it("player-permissions page covers three boolean flags", () => {
    const page = PHONE_HOST_EDITOR_SCHEMA.pages.find(
      (p) => p.id === "player-permissions",
    );
    assert.equal(page?.status, "ready");
    const items = resolvePageContentItems(
      PHONE_HOST_EDITOR_SCHEMA,
      page?.contentItemIds,
    );
    assert.deepEqual(
      items.map((item) => item.id),
      [
        "allowPlayerCustomization",
        "allowPlayerWallpaper",
        "allowPlayerIcons",
      ],
    );
    assert.ok(items.every((item) => item.fieldType === "boolean"));
  });

  it("story message pages belong to phone host not chat app", () => {
    const byId = new Map(
      PHONE_HOST_EDITOR_SCHEMA.pages.map((p) => [p.id, p]),
    );
    assert.equal(byId.get("story-role-presets")?.status, "ready");
    assert.equal(byId.get("story-role-presets")?.preview, "chat");
    assert.equal(byId.get("story-message-behavior")?.status, "ready");
    assert.ok(
      PHONE_HOST_EDITOR_SCHEMA.contentItems.some(
        (item) => item.id === "markOutgoingUnreadReadBeforeIncoming",
      ),
    );
  });

  it("defaultEditorPageId prefers ready page", () => {
    assert.equal(
      defaultEditorPageId(PHONE_HOST_EDITOR_SCHEMA.pages),
      "home-style",
    );
  });
});
