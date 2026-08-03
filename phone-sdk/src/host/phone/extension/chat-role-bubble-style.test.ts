/**
 * @file chat-role-bubble-style.test.ts
 * @description 聊天角色气泡样式消毒、归一化与 style 合并单测。
 * @author 池水三两升
 * @date 2026-08-04
 * @version 0.4.4
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBubbleStyleParts,
  normalizeBubbleColor,
  normalizeChatRoleBubbleStyle,
  normalizeFontSize,
  normalizeHexColor,
  sanitizeBubbleCustomCss,
} from "./chat-role-bubble-style.ts";

describe("normalizeHexColor", () => {
  it("接受 #RGB / #RRGGBB / #RRGGBBAA 并归一为小写", () => {
    assert.equal(normalizeHexColor("#fff"), "#fff");
    assert.equal(normalizeHexColor("#FF0000"), "#ff0000");
    assert.equal(normalizeHexColor("#ff000080"), "#ff000080");
  });

  it("非法颜色或非字符串返回 undefined", () => {
    assert.equal(normalizeHexColor("red"), undefined);
    assert.equal(normalizeHexColor("#gggggg"), undefined);
    assert.equal(normalizeHexColor(123), undefined);
    assert.equal(normalizeHexColor(""), undefined);
  });
});

describe("normalizeFontSize", () => {
  it("纯数字补 px；合法 px/rem/em 保留", () => {
    assert.equal(normalizeFontSize("14"), "14px");
    assert.equal(normalizeFontSize(" 16px "), "16px");
    assert.equal(normalizeFontSize("1rem"), "1rem");
    assert.equal(normalizeFontSize("1.25em"), "1.25em");
  });

  it("超出 10–32px 等价范围或非法格式丢弃", () => {
    assert.equal(normalizeFontSize("9px"), undefined);
    assert.equal(normalizeFontSize("33px"), undefined);
    assert.equal(normalizeFontSize("0.5rem"), undefined);
    assert.equal(normalizeFontSize("abc"), undefined);
    assert.equal(normalizeFontSize(null), undefined);
  });
});

describe("normalizeBubbleColor", () => {
  it("优先 hex；否则走 sanitizeBackgroundCss 规则", () => {
    assert.equal(normalizeBubbleColor("#abc"), "#abc");
    assert.equal(
      normalizeBubbleColor("linear-gradient(180deg, #111, #222)"),
      "linear-gradient(180deg, #111, #222)",
    );
  });

  it("含 url( 或非安全 background 丢弃", () => {
    assert.equal(normalizeBubbleColor("url(http://x)"), undefined);
    assert.equal(normalizeBubbleColor("red; background: url(x)"), undefined);
  });
});

describe("sanitizeBubbleCustomCss", () => {
  it("接受分号分隔的安全声明串", () => {
    assert.equal(
      sanitizeBubbleCustomCss("font-size: 15px; color: #eee"),
      "font-size: 15px; color: #eee",
    );
  });

  it("含 url(、@、花括号或非法属性名时整段丢弃", () => {
    assert.equal(sanitizeBubbleCustomCss("background: url(x)"), undefined);
    assert.equal(sanitizeBubbleCustomCss("@import 'x'"), undefined);
    assert.equal(sanitizeBubbleCustomCss("a { color: red }"), undefined);
    assert.equal(sanitizeBubbleCustomCss("bad prop: 1"), undefined);
    assert.equal(
      sanitizeBubbleCustomCss("color: expression(alert(1))"),
      undefined,
    );
  });
});

describe("normalizeChatRoleBubbleStyle", () => {
  it("从 raw 记录提取并消毒各字段", () => {
    assert.deepEqual(
      normalizeChatRoleBubbleStyle({
        fontSize: "14",
        textColor: "#FFFFFF",
        nameColor: "#ccc",
        bubbleColor: "#112233",
        customCss: "padding: 4px",
      }),
      {
        fontSize: "14px",
        textColor: "#ffffff",
        nameColor: "#ccc",
        bubbleColor: "#112233",
        customCss: "padding: 4px",
      },
    );
  });

  it("非法字段静默丢弃", () => {
    assert.deepEqual(
      normalizeChatRoleBubbleStyle({
        fontSize: "99px",
        textColor: "not-a-color",
        customCss: "background: url(x)",
      }),
      {},
    );
  });
});

describe("buildBubbleStyleParts", () => {
  it("结构化字段映射到 bubble / body / name", () => {
    assert.deepEqual(
      buildBubbleStyleParts({
        fontSize: "14px",
        textColor: "#fff",
        nameColor: "rgba(255,255,255,0.78)",
        bubbleColor: "#334455",
      }),
      {
        bubble: { background: "#334455" },
        body: { fontSize: "14px", color: "#fff" },
        name: { color: "rgba(255,255,255,0.78)" },
      },
    );
  });

  it("customCss background 覆盖 bubbleColor；font-size 同步进 body", () => {
    assert.deepEqual(
      buildBubbleStyleParts({
        bubbleColor: "#111111",
        fontSize: "14px",
        customCss: "background: #222222; font-size: 18px",
      }),
      {
        bubble: { background: "#222222", fontSize: "18px" },
        body: { fontSize: "18px" },
        name: {},
      },
    );
  });

  it("customCss color 覆盖结构化 textColor 并同步 body", () => {
    assert.deepEqual(
      buildBubbleStyleParts({
        textColor: "#aaa",
        customCss: "color: #bbb",
      }),
      {
        bubble: { color: "#bbb" },
        body: { color: "#bbb" },
        name: {},
      },
    );
  });

  it("--phone-name-color 写入 name.color", () => {
    assert.deepEqual(
      buildBubbleStyleParts({
        nameColor: "#ccc",
        customCss: "--phone-name-color: #ddd",
      }),
      {
        bubble: { "--phone-name-color": "#ddd" },
        body: {},
        name: { color: "#ddd" },
      },
    );
  });

  it("全空返回三个空对象", () => {
    assert.deepEqual(buildBubbleStyleParts({}), {
      bubble: {},
      body: {},
      name: {},
    });
  });
});
