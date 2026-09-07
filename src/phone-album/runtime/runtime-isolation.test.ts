import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AlbumAuthorSettings, AlbumSaveState } from "../types";
import { DEFAULT_ALBUM_APPEARANCE } from "./appearance-parse";
import {
  clearLastShotIf,
  consumeResumeTab,
  getLastShotMediaId,
  getLastShotThumb,
  isCaptureBusy,
  rememberLastShot,
  setCaptureBusy,
  setResumeTab,
} from "./camera-session";
import {
  cacheAuthorSettings,
  getCachedAuthorSettings,
} from "./settings";
import {
  getAlbumSaveState,
  setAlbumSaveState,
  subscribeAlbumStore,
} from "./store";

function emptySave(): AlbumSaveState {
  return {
    albumsExtra: [],
    albumsRemoved: [],
    albumsMeta: [],
    media: [],
    albumMedia: [],
    mediaRemoved: [],
  };
}

function authorSettings(title: string): AlbumAuthorSettings {
  return {
    ...DEFAULT_ALBUM_APPEARANCE,
    appTitle: title,
    allAlbumsLabel: "全部",
    emptyAlbumHint: "空",
    defaultAlbums: [],
    defaultMedia: [],
  };
}

describe("phone album runtime isolation", () => {
  it("keeps settings and save state separate per Preview key", () => {
    const previewA = {};
    const previewB = {};
    cacheAuthorSettings(previewA, authorSettings("A 相册"));
    cacheAuthorSettings(previewB, authorSettings("B 相册"));

    const stateA = emptySave();
    stateA.media.push({
      id: "a",
      type: "image",
      asset: "a.png",
      createdAt: 1,
    });
    setAlbumSaveState(previewA, stateA);

    assert.equal(getCachedAuthorSettings(previewA).appTitle, "A 相册");
    assert.equal(getCachedAuthorSettings(previewB).appTitle, "B 相册");
    assert.deepEqual(getAlbumSaveState(previewA).media.map((item) => item.id), ["a"]);
    assert.deepEqual(getAlbumSaveState(previewB).media, []);
  });

  it("publishes store changes only to listeners in the same Preview", () => {
    const previewA = {};
    const previewB = {};
    let eventsA = 0;
    let eventsB = 0;
    const offA = subscribeAlbumStore(previewA, () => eventsA += 1);
    const offB = subscribeAlbumStore(previewB, () => eventsB += 1);

    setAlbumSaveState(previewA, emptySave());
    assert.equal(eventsA, 1);
    assert.equal(eventsB, 0);

    offA();
    offB();
  });

  it("keeps camera resume, thumbnail and busy state separate", () => {
    const previewA = {};
    const previewB = {};
    setResumeTab(previewA, "camera");
    setCaptureBusy(previewA, true);
    rememberLastShot(previewA, "data:image/jpeg;base64,A", "shot-a");

    assert.equal(consumeResumeTab(previewA), "camera");
    assert.equal(consumeResumeTab(previewB), "album");
    assert.equal(isCaptureBusy(previewA), true);
    assert.equal(isCaptureBusy(previewB), false);
    assert.equal(getLastShotThumb(previewA), "data:image/jpeg;base64,A");
    assert.equal(getLastShotMediaId(previewB), undefined);

    clearLastShotIf(previewA, "shot-a");
    assert.equal(getLastShotThumb(previewA), undefined);
  });
});
