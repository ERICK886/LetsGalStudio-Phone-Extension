/**
 * @file escape.test.ts
 * @description 标题字符串转义工具单测（JSON / JS 双引号上下文）。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  escapeForJsString,
  escapeForJsonString,
} from "./escape.ts";
import { renderTemplateString } from "./template.ts";

describe("escapeForJsString / escapeForJsonString", () => {
  it("转义双引号与反斜杠", () => {
    assert.equal(escapeForJsString('Say "Hi"'), 'Say \\"Hi\\"');
    assert.equal(escapeForJsonString('a\\b'), "a\\\\b");
  });

  it("转义换行等控制字符", () => {
    assert.equal(escapeForJsString("a\nb"), "a\\nb");
    assert.equal(escapeForJsonString("a\tb"), "a\\tb");
  });

  it("含引号的 title 经模板渲染后 extension.json 可 JSON.parse", () => {
    const titleRaw = '商店 "特价"';
    const template = `{
  "name": "{{titleJson}}",
  "description": "{{titleJson}} 手机内页"
}`;
    const rendered = renderTemplateString(template, {
      titleJson: escapeForJsonString(titleRaw),
    });
    const parsed = JSON.parse(rendered) as {
      name: string;
      description: string;
    };

    assert.equal(parsed.name, titleRaw);
    assert.equal(parsed.description, `${titleRaw} 手机内页`);
  });
});
