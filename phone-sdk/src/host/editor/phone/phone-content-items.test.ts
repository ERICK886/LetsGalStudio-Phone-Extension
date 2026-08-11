/**
 * @file phone-content-items.test.ts
 * @description 宿主 contentItems（经 schema）单测。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHONE_HOST_CONTENT_ITEMS,
  PHONE_HOST_EDITOR_SCHEMA,
  getSectionContentItem,
} from "../schema/phone-host-editor-schema.ts";

describe("PHONE_HOST_CONTENT_ITEMS", () => {
  it("has 12 unique items matching schema", () => {
    assert.equal(PHONE_HOST_CONTENT_ITEMS.length, 12);
    assert.equal(
      PHONE_HOST_CONTENT_ITEMS.length,
      PHONE_HOST_EDITOR_SCHEMA.contentItems.length,
    );
    const ids = PHONE_HOST_CONTENT_ITEMS.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("lookup via getSectionContentItem", () => {
    assert.ok(getSectionContentItem(PHONE_HOST_EDITOR_SCHEMA, "phoneTitle"));
    assert.ok(getSectionContentItem(PHONE_HOST_EDITOR_SCHEMA, "shellColor"));
  });
});
