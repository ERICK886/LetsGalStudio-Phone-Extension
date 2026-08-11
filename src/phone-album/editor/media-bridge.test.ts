/**
 * @file media-bridge.test.ts
 * @description 默认媒体 bridge 纯函数单测。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBlankDefaultMedia,
  parseEditableDefaultMedia,
  serializeEditableDefaultMedia,
  serializeMediaAlbumIds,
  stripAlbumIdFromMedia,
  type EditableDefaultMedia,
} from "./media-bridge-core.ts";

describe("serializeMediaAlbumIds", () => {
  it("joins albumIds", () => {
    assert.equal(serializeMediaAlbumIds(["a", "b"]), "a,b");
  });

  it("dedupes and skips blank", () => {
    assert.equal(serializeMediaAlbumIds(["a", "a", "", " b "]), "a,b");
  });
});

describe("stripAlbumIdFromMedia", () => {
  it("removes id", () => {
    const next = stripAlbumIdFromMedia(
      [
        {
          uid: "1",
          id: "m1",
          type: "image",
          asset: "x",
          albumIds: ["a", "b"],
          durationSec: 0,
          posterAsset: "",
        },
      ],
      "a",
    );
    assert.deepEqual(next[0]!.albumIds, ["b"]);
  });

  it("preserves uid and other fields", () => {
    const row: EditableDefaultMedia = {
      uid: "u1",
      id: "m1",
      type: "video",
      asset: "v.mp4",
      albumIds: ["x"],
      durationSec: 12,
      posterAsset: "p.jpg",
    };
    const [next] = stripAlbumIdFromMedia([row], "x");
    assert.equal(next!.uid, "u1");
    assert.equal(next!.durationSec, 12);
    assert.deepEqual(next!.albumIds, []);
  });
});

describe("serializeEditableDefaultMedia", () => {
  it("filters blank asset rows", () => {
    const payload = serializeEditableDefaultMedia([
      {
        uid: "1",
        id: "m1",
        type: "image",
        asset: "",
        albumIds: [],
        durationSec: 0,
        posterAsset: "",
      },
      {
        uid: "2",
        id: "m2",
        type: "image",
        asset: "  pic.png ",
        albumIds: ["a"],
        durationSec: 0,
        posterAsset: "",
      },
    ]);

    assert.equal(payload.length, 1);
    assert.equal(payload[0]!.id, "m2");
    assert.equal(payload[0]!.asset, "pic.png");
    assert.equal(payload[0]!.albumIds, "a");
  });

  it("dedupes media id", () => {
    const payload = serializeEditableDefaultMedia([
      {
        uid: "1",
        id: "dup",
        type: "image",
        asset: "a.png",
        albumIds: [],
        durationSec: 0,
        posterAsset: "",
      },
      {
        uid: "2",
        id: "dup",
        type: "video",
        asset: "b.mp4",
        albumIds: [],
        durationSec: 0,
        posterAsset: "",
      },
    ]);

    assert.equal(payload.length, 1);
    assert.equal(payload[0]!.asset, "a.png");
  });
});

describe("parseEditableDefaultMedia", () => {
  it("uses the business id as a stable uid across reads", () => {
    const rows = parseEditableDefaultMedia([
      {
        id: "m1",
        type: "image",
        asset: "x.png",
        albumIds: "a, b",
      },
    ]);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0]!.albumIds, ["a", "b"]);
    assert.equal(rows[0]!.uid, "m1");
    assert.equal(
      parseEditableDefaultMedia([
        { id: "m1", type: "image", asset: "x.png", albumIds: "a, b" },
      ])[0]!.uid,
      "m1",
    );
  });

  it("skips invalid rows", () => {
    const rows = parseEditableDefaultMedia([
      { id: "m1", type: "gif", asset: "x.png" },
      { id: "", type: "image", asset: "y.png" },
      { id: "m2", type: "image", asset: "  " },
    ]);
    assert.equal(rows.length, 0);
  });
});

describe("createBlankDefaultMedia", () => {
  it("avoids id collisions", () => {
    const row = createBlankDefaultMedia(new Set(["new-media", "new-media-2"]));
    assert.equal(row.id, "new-media-3");
    assert.equal(row.asset, "");
    assert.equal(row.type, "image");
  });
});
