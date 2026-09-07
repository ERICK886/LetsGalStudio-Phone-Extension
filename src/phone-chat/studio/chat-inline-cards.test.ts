import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CHAT_INLINE_CARD_METHOD_META,
  buildChatInlineCardDetails,
} from "./chat-inline-cards.ts";

describe("chat group inline cards", () => {
  it("recognizes all four group methods", () => {
    assert.equal(CHAT_INLINE_CARD_METHOD_META["send-group-messages"].label, "聊天 · 群成员发送消息");
    assert.equal(CHAT_INLINE_CARD_METHOD_META["await-group-reply"].label, "聊天 · 玩家回复群聊");
    assert.equal(CHAT_INLINE_CARD_METHOD_META["join-group"].label, "聊天 · 角色加入群聊");
    assert.equal(CHAT_INLINE_CARD_METHOD_META["leave-group"].label, "聊天 · 角色退出群聊");
  });

  it("renders group sender, message count and navigation chips", () => {
    const details = buildChatInlineCardDetails(
      "send-group-messages",
      {
        groupId: "club",
        contentType: "text",
        message: "今晚开会",
        contentType2: "image",
        imageAsset2: "ui/photo.png",
        openPhone: true,
        waitUntilClose: true,
      },
      "林夏",
    );

    assert.equal(details.summary, "林夏 在群聊 club 发送 2 条消息：今晚开会");
    assert.deepEqual(details.chips, [
      "群：club",
      "发送者：林夏",
      "2 条消息",
      "打开手机",
      "等待关手机",
    ]);
  });

  it("renders group reply state with no character parameter", () => {
    const details = buildChatInlineCardDetails(
      "await-group-reply",
      {
        groupId: "club",
        reply1ContentType: "text",
        reply1: "收到",
        requireReply: true,
        outgoingStatus: "read",
        closePhoneAfter: true,
      },
      "",
    );

    assert.equal(details.summary, "等待回复群聊 club：收到");
    assert.deepEqual(details.chips, [
      "群：club",
      "1 个选项",
      "必须回复",
      "状态：read",
      "回复后关手机",
    ]);
  });

  it("renders replies attached to a group member message", () => {
    const details = buildChatInlineCardDetails(
      "send-group-messages",
      {
        groupId: "club",
        message: "今晚开会",
        reply1: "收到",
        requireReply: true,
        outgoingStatus: "read",
        openPhone: false,
        closePhoneAfter: true,
      },
      "林夏",
    );

    assert.equal(
      details.summary,
      "林夏 在群聊 club 发送 1 条消息：今晚开会；等待回复：收到",
    );
    assert.deepEqual(details.chips, [
      "群：club",
      "发送者：林夏",
      "1 条消息",
      "1 个回复选项",
      "必须回复",
      "状态：read",
      "打开手机",
      "回复后关手机",
    ]);
  });
});
