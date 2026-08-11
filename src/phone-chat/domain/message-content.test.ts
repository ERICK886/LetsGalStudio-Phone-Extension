/**
 * @file message-content.test.ts
 * @description 消息内容类型归一化与入列槽位解析。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeContentType,
  resolveMessageSlot,
} from "./message-content.ts";

describe("normalizeContentType", () => {
  it("缺省或非 image 字符串均视为 text", () => {
    assert.equal(normalizeContentType(undefined), "text");
    assert.equal(normalizeContentType(null), "text");
    assert.equal(normalizeContentType(""), "text");
    assert.equal(normalizeContentType("text"), "text");
    assert.equal(normalizeContentType("IMAGE"), "text");
    assert.equal(normalizeContentType(123), "text");
  });

  it('"image" 归一化为 image', () => {
    assert.equal(normalizeContentType("image"), "image");
  });
});

describe("resolveMessageSlot", () => {
  it("文字槽 trim 后非空则成功", () => {
    assert.deepEqual(
      resolveMessageSlot({ contentType: "text", text: "  你好  ", imageAsset: "" }),
      { contentType: "text", text: "你好" },
    );
    assert.deepEqual(
      resolveMessageSlot({ contentType: undefined, text: "嗨", imageAsset: undefined }),
      { contentType: "text", text: "嗨" },
    );
  });

  it("文字槽为空则返回 null", () => {
    assert.equal(
      resolveMessageSlot({ contentType: "text", text: "   ", imageAsset: "" }),
      null,
    );
    assert.equal(
      resolveMessageSlot({ contentType: undefined, text: "", imageAsset: undefined }),
      null,
    );
  });

  it("图片槽 imageAsset trim 后非空则成功", () => {
    assert.deepEqual(
      resolveMessageSlot({
        contentType: "image",
        text: "",
        imageAsset: "  asset://img-1  ",
      }),
      { contentType: "image", imageAsset: "asset://img-1" },
    );
  });

  it("图片槽 imageAsset 为空则返回 null", () => {
    assert.equal(
      resolveMessageSlot({ contentType: "image", text: "ignored", imageAsset: "  " }),
      null,
    );
    assert.equal(
      resolveMessageSlot({ contentType: "image", text: "x", imageAsset: undefined }),
      null,
    );
  });

  it("图片槽忽略空文字", () => {
    assert.deepEqual(
      resolveMessageSlot({
        contentType: "image",
        text: "   ",
        imageAsset: "asset://pic",
      }),
      { contentType: "image", imageAsset: "asset://pic" },
    );
  });
});
