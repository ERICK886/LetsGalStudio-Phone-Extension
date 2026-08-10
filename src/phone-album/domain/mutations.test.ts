/**
 * @file mutations.test.ts
 * @description 存档突变纯函数单测。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AlbumAuthorSettings, AlbumSaveState } from "../types";
import { buildAlbumCatalog } from "./merge";
import {
  applyAddAlbum,
  applyAddMedia,
  applyRemoveAlbum,
  applyRemoveMedia,
  applySetMediaAlbums,
} from "./mutations";

const settings = (): AlbumAuthorSettings => ({
  appTitle: "相册",
  allAlbumsLabel: "全部",
  emptyAlbumHint: "空",
  defaultAlbums: [{ id: "trip", name: "旅行" }],
  defaultMedia: [
    { id: "m1", type: "image", asset: "a1", albumIds: ["trip"] },
  ],
});

const empty = (): AlbumSaveState => ({
  albumsExtra: [],
  albumsRemoved: [],
  albumsMeta: [],
  media: [],
  albumMedia: [],
  mediaRemoved: [],
});

describe("mutations", () => {
  it("add-album upserts meta and clears removed", () => {
    let s = empty();
    s.albumsRemoved = ["trip"];
    s = applyAddAlbum(s, settings(), {
      albumId: "trip",
      name: "旅行改",
    });
    assert.ok(!s.albumsRemoved.includes("trip"));
    assert.equal(s.albumsMeta.find((m) => m.id === "trip")?.name, "旅行改");
  });

  it("remove-album does not remove media from all", () => {
    let s = empty();
    s = applyRemoveAlbum(s, settings(), "trip");
    const cat = buildAlbumCatalog(settings(), s);
    assert.equal(cat.allMedia.length, 1);
    assert.ok(!cat.albums.some((a) => a.id === "trip"));
  });

  it("add-media upsert + links; ignores unknown album ids", () => {
    let s = empty();
    s = applyAddMedia(s, settings(), {
      mediaId: "m2",
      type: "video",
      asset: "v2",
      albumIds: ["trip", "nope"],
      durationSec: 3,
    });
    assert.equal(s.media.length, 1);
    assert.deepEqual(
      s.albumMedia.filter((l) => l.mediaId === "m2").map((l) => l.albumId),
      ["trip"],
    );
  });

  it("remove-media clears links and marks default removed", () => {
    let s = empty();
    s = applyRemoveMedia(s, settings(), "m1");
    assert.ok(s.mediaRemoved.includes("m1"));
    const cat = buildAlbumCatalog(settings(), s);
    assert.equal(cat.allMedia.length, 0);
  });

  it("set-media-albums replaces links", () => {
    let s = empty();
    s = applyAddAlbum(s, settings(), { albumId: "fav", name: "收藏" });
    s = applyAddMedia(s, settings(), {
      mediaId: "m2",
      type: "image",
      asset: "x",
      albumIds: ["trip"],
    });
    s = applySetMediaAlbums(s, settings(), "m2", ["fav"]);
    assert.deepEqual(
      s.albumMedia.filter((l) => l.mediaId === "m2").map((l) => l.albumId),
      ["fav"],
    );
  });
});
