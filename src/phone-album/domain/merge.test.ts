/**
 * @file merge.test.ts
 * @description 默认 + 存档合并单测。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_ALBUM_ID } from "../constants";
import type { AlbumAuthorSettings, AlbumSaveState } from "../types";
import { buildAlbumCatalog } from "./merge";

const emptySave = (): AlbumSaveState => ({
  albumsExtra: [],
  albumsRemoved: [],
  albumsMeta: [],
  media: [],
  albumMedia: [],
  mediaRemoved: [],
});

const baseSettings = (): AlbumAuthorSettings => ({
  appTitle: "相册",
  allAlbumsLabel: "全部",
  emptyAlbumHint: "空",
  defaultAlbums: [{ id: "trip", name: "旅行" }],
  defaultMedia: [
    {
      id: "m1",
      type: "image",
      asset: "asset://m1",
      albumIds: ["trip"],
    },
  ],
});

describe("buildAlbumCatalog", () => {
  it("seeds defaults into all + album", () => {
    const cat = buildAlbumCatalog(baseSettings(), emptySave());
    assert.equal(cat.allMedia.length, 1);
    assert.equal(cat.mediaByAlbum.get("trip")?.length, 1);
    const allCard = cat.albums.find((a) => a.id === ALL_ALBUM_ID);
    assert.ok(allCard);
    assert.equal(allCard!.count, 1);
  });

  it("remove album keeps media in all", () => {
    const save = emptySave();
    save.albumsRemoved = ["trip"];
    const cat = buildAlbumCatalog(baseSettings(), save);
    assert.ok(!cat.albums.some((a) => a.id === "trip"));
    assert.equal(cat.allMedia.length, 1);
  });

  it("mediaRemoved hides default media", () => {
    const save = emptySave();
    save.mediaRemoved = ["m1"];
    const cat = buildAlbumCatalog(baseSettings(), save);
    assert.equal(cat.allMedia.length, 0);
  });

  it("dynamic media + multi album links", () => {
    const save = emptySave();
    save.albumsExtra = ["fav"];
    save.albumsMeta = [{ id: "fav", name: "收藏" }];
    save.media = [
      {
        id: "m2",
        type: "video",
        asset: "asset://m2",
        createdAt: 1,
        durationSec: 12,
      },
    ];
    save.albumMedia = [
      { albumId: "trip", mediaId: "m2" },
      { albumId: "fav", mediaId: "m2" },
    ];
    const cat = buildAlbumCatalog(baseSettings(), save);
    assert.equal(cat.allMedia.length, 2);
    assert.equal(cat.mediaByAlbum.get("trip")?.length, 2);
    assert.equal(cat.mediaByAlbum.get("fav")?.length, 1);
  });
});
