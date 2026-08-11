/**
 * @file albums-bridge.test.ts
 * @description 默认相册 bridge 纯函数单测。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBlankDefaultAlbum,
  parseEditableDefaultAlbums,
  serializeEditableDefaultAlbums,
} from "./albums-bridge-core.ts";

describe("parseEditableDefaultAlbums", () => {
  it("uses the business id as a stable uid across reads", () => {
    const rows = parseEditableDefaultAlbums([
      { id: "a1", name: "旅行", coverAsset: "cover.jpg" },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.id, "a1");
    assert.equal(rows[0]!.name, "旅行");
    assert.equal(rows[0]!.coverAsset, "cover.jpg");
    assert.equal(rows[0]!.uid, "a1");
    assert.equal(parseEditableDefaultAlbums([{ id: "a1", name: "旅行" }])[0]!.uid, "a1");
  });

  it("accepts legacy asset field as cover", () => {
    const rows = parseEditableDefaultAlbums([
      { id: "a1", name: "x", asset: "legacy.png" },
    ]);
    assert.equal(rows[0]!.coverAsset, "legacy.png");
  });

  it("dedupes album id on read", () => {
    const rows = parseEditableDefaultAlbums([
      { id: "dup", name: "A" },
      { id: "dup", name: "B" },
    ]);
    assert.equal(rows.length, 1);
  });
});

describe("serializeEditableDefaultAlbums", () => {
  it("omits empty coverAsset", () => {
    const payload = serializeEditableDefaultAlbums([
      { uid: "1", id: "a1", name: "相册", coverAsset: "" },
    ]);
    assert.equal(payload.length, 1);
    assert.equal(payload[0]!.id, "a1");
    assert.equal(payload[0]!.name, "相册");
    assert.equal("coverAsset" in payload[0]!, false);
  });

  it("dedupes id on write", () => {
    const payload = serializeEditableDefaultAlbums([
      { uid: "1", id: "dup", name: "First", coverAsset: "" },
      { uid: "2", id: "dup", name: "Second", coverAsset: "" },
    ]);
    assert.equal(payload.length, 1);
    assert.equal(payload[0]!.name, "First");
  });
});

describe("createBlankDefaultAlbum", () => {
  it("avoids id collisions", () => {
    const row = createBlankDefaultAlbum(new Set(["new-album", "new-album-2"]));
    assert.equal(row.id, "new-album-3");
    assert.equal(row.name, "新相册");
    assert.equal(row.coverAsset, "");
  });
});
