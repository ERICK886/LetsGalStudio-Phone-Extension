/**
 * @file album-app-editor-schema.test.ts
 * @description 相册 APP 编辑 schema 结构冒烟。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALBUM_APP_EDITOR_SCHEMA,
  ALBUM_APPEARANCE_CONTENT_ITEMS,
} from "./album-app-editor-schema.ts";

describe("ALBUM_APP_EDITOR_SCHEMA", () => {
  it("album schema pages and copy keys", () => {
    const ids = ALBUM_APP_EDITOR_SCHEMA.pages.map((p) => p.id).sort();
    assert.deepEqual(
      ids,
      ["album-appearance", "album-catalog", "album-copy", "album-media"].sort(),
    );
    const copyIds = ALBUM_APP_EDITOR_SCHEMA.contentItems
      .filter((c) => ["appTitle", "allAlbumsLabel", "emptyAlbumHint"].includes(c.id))
      .map((c) => c.id)
      .sort();
    assert.deepEqual(
      copyIds,
      ["allAlbumsLabel", "appTitle", "emptyAlbumHint"].sort(),
    );
    assert.equal(ALBUM_APP_EDITOR_SCHEMA.settingsModuleId, "phone-album");
  });

  it("album-appearance page contains all appearance items", () => {
    const appearancePage = ALBUM_APP_EDITOR_SCHEMA.pages.find(
      (p) => p.id === "album-appearance",
    );
    assert.ok(appearancePage, "album-appearance page exists");
    assert.equal(appearancePage?.order, 40);
    const appearanceIds = new Set(
      ALBUM_APPEARANCE_CONTENT_ITEMS.map((item) => item.id),
    );
    const pageIds = new Set(appearancePage?.contentItemIds ?? []);
    assert.deepEqual(pageIds, appearanceIds);
  });

  it("appearance contentItems include color, enum, boolean, multiline css", () => {
    const find = (id: string) =>
      ALBUM_APP_EDITOR_SCHEMA.contentItems.find((c) => c.id === id);
    assert.equal(find("styleAccent")?.fieldType, "color");
    assert.equal(find("styleHomeColumns")?.fieldType, "enum");
    assert.equal(find("styleShowTabLabels")?.fieldType, "boolean");
    assert.equal(find("styleCustomCss")?.fieldType, "string");
    assert.equal(find("styleCustomCss")?.multiline, true);
  });
});
