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
  buildReplySchemaFields,
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
  it("为每条效果提供默认赋值与复合运算选项", () => {
    const fields = buildReplySchemaFields();
    assert.deepEqual(fields.reply1Op1, {
      type: "enum",
      label: "玩家回复 1 · 效果1 运算",
      default: "=",
      options: [
        { label: "赋值 (=)", value: "=" },
        { label: "加 (+=)", value: "+=" },
        { label: "减 (-=)", value: "-=" },
        { label: "乘 (*=)", value: "*=" },
        { label: "除 (/=)", value: "/=" },
        { label: "取余 (%=)", value: "%=" },
      ],
    });
  });

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

  it("解析回复效果的复合赋值运算并让旧数据继续按赋值处理", () => {
    const result = parseRepliesFromParams({
      reply1: "行动",
      reply1Var1: "score",
      reply1Op1: "+=",
      reply1Val1: "2",
      reply1Var2: "flag",
      reply1Val2: "true",
    });

    assert.deepEqual(result[0]!.effects, [
      { variable: "score", operator: "+=", value: "2" },
      { variable: "flag", value: "true" },
    ]);
  });
});
