import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  clearPendingDefaultMedia,
  listPendingDefaultMedia,
  mergePendingDefaultMedia,
  removePendingDefaultMedia,
  upsertPendingDefaultMedia,
} from "./album-editor-drafts.ts";
import { createBlankDefaultMedia } from "./media-bridge-core.ts";

afterEach(clearPendingDefaultMedia);

describe("album editor media drafts", () => {
  it("keeps a blank newly added media row until it receives an asset", () => {
    const draft = createBlankDefaultMedia();
    upsertPendingDefaultMedia(draft);

    assert.deepEqual(mergePendingDefaultMedia([]), [draft]);
    assert.equal(listPendingDefaultMedia().length, 1);

    removePendingDefaultMedia(draft.uid);
    assert.deepEqual(mergePendingDefaultMedia([]), []);
  });

  it("lets a persisted write replace the draft after an asset is supplied", () => {
    const draft = createBlankDefaultMedia();
    upsertPendingDefaultMedia(draft);
    const completed = { ...draft, asset: "asset://photo.png" };

    upsertPendingDefaultMedia(completed);
    assert.deepEqual(mergePendingDefaultMedia([]), [completed]);
    removePendingDefaultMedia(completed.uid);
    assert.deepEqual(mergePendingDefaultMedia([completed]), [completed]);
  });
});
