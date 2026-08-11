/**
 * @file method-params-messages.test.ts
 * @description 好友消息与回复槽解析（text / image / 空槽跳过）。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseFriendMessagesFromParams,
  parseRepliesFromParams,
} from "./method-params.ts";

describe("parseFriendMessagesFromParams", () => {
  it("解析文字槽", () => {
    const result = parseFriendMessagesFromParams({ message: "  你好  " });
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      text: "你好",
      contentType: "text",
      direction: "incoming",
      status: "read",
    });
  });

  it("解析图片槽", () => {
    const result = parseFriendMessagesFromParams({
      contentType: "image",
      message: "",
      imageAsset: "  asset://pic-1  ",
    });
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      text: "",
      contentType: "image",
      imageAsset: "asset://pic-1",
      direction: "incoming",
      status: "read",
    });
  });

  it("跳过空槽", () => {
    assert.deepEqual(parseFriendMessagesFromParams({}), []);
    assert.deepEqual(
      parseFriendMessagesFromParams({
        message: "   ",
        contentType2: "image",
        imageAsset2: "",
      }),
      [],
    );
  });

  it("混合多槽仅保留有效项", () => {
    const result = parseFriendMessagesFromParams({
      message: "第一句",
      contentType2: "image",
      imageAsset2: "asset://img-2",
      message3: "",
    });
    assert.equal(result.length, 2);
    assert.equal(result[0]!.text, "第一句");
    assert.equal(result[0]!.contentType, "text");
    assert.equal(result[1]!.contentType, "image");
    assert.equal(result[1]!.imageAsset, "asset://img-2");
  });
});

describe("parseRepliesFromParams", () => {
  it("解析文字回复", () => {
    const result = parseRepliesFromParams({ reply1: "  好的  " });
    assert.equal(result.length, 1);
    assert.match(result[0]!.id, /^reply-/);
    assert.deepEqual(result[0], {
      id: result[0]!.id,
      text: "好的",
      contentType: "text",
      effects: [],
    });
  });

  it("解析图片回复", () => {
    const result = parseRepliesFromParams({
      reply1ContentType: "image",
      reply1: "",
      reply1Image: "asset://reply-pic",
    });
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], {
      id: result[0]!.id,
      text: "",
      contentType: "image",
      imageAsset: "asset://reply-pic",
      effects: [],
    });
  });

  it("跳过空回复槽", () => {
    assert.deepEqual(parseRepliesFromParams({}), []);
    assert.deepEqual(
      parseRepliesFromParams({
        reply1: "   ",
        reply2ContentType: "image",
        reply2Image: "",
      }),
      [],
    );
  });

  it("图片回复仍保留 effects", () => {
    const result = parseRepliesFromParams({
      reply1ContentType: "image",
      reply1Image: "asset://x",
      reply1Var1: "score",
      reply1Val1: 10,
    });
    assert.equal(result.length, 1);
    assert.equal(result[0]!.contentType, "image");
    assert.deepEqual(result[0]!.effects, [{ variable: "score", value: "10" }]);
  });
});
