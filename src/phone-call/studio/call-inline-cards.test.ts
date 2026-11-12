import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CALL_INLINE_CARD_ACCENT,
  CALL_INLINE_CARD_METHOD_META,
  buildCallInlineCardDetails,
} from "./call-inline-cards.ts";

describe("phone call inline cards", () => {
  it("uses its own green accent and recognizes every call method", () => {
    assert.equal(CALL_INLINE_CARD_ACCENT, "#0f9f78");
    assert.equal(CALL_INLINE_CARD_METHOD_META["incoming-call"].label, "电话 · 发起强制来电");
    assert.equal(CALL_INLINE_CARD_METHOD_META["define-outgoing-call"].label, "电话 · 定义自主拨号剧情");
    assert.equal(CALL_INLINE_CARD_METHOD_META["add-contact"].label, "电话 · 添加联系人");
    assert.equal(CALL_INLINE_CARD_METHOD_META["remove-contact"].label, "电话 · 移除联系人");
  });

  it("summarizes required incoming calls and their fragments", () => {
    assert.deepEqual(
      buildCallInlineCardDetails(
        "incoming-call",
        {
          requireAnswer: true,
          position: "bottom-right",
          answerStory: "answer-fragment",
          declineStory: "decline-fragment",
        },
        "筱",
      ),
      {
        summary: "筱 发起来电，玩家必须接听",
        chips: ["角色：筱", "必须接听", "方位：右下", "接听后有剧情"],
      },
    );
  });

  it("summarizes contact and outgoing-story methods", () => {
    assert.deepEqual(
      buildCallInlineCardDetails(
        "define-outgoing-call",
        { story: "dial-story" },
        "筱",
      ),
      {
        summary: "定义拨打 筱 时进入的剧情片段",
        chips: ["联系人：筱", "已配置拨号剧情"],
      },
    );
    assert.match(
      buildCallInlineCardDetails("remove-contact", {}, "筱").summary,
      /保留通话记录/,
    );
  });

});
