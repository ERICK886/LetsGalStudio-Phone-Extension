/**
 * @file register.test.ts
 * @description registerPhoneApp 规范化：custom panes、contentItems multiline 等。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { normalizeCustomPanesResolver } from "./normalize-custom-panes.ts";
import { registerPhoneApp } from "./register.ts";
import { PHONE_SDK_GLOBAL_KEY } from "./slot.ts";
import type { ResolvePhoneEditorCustomPanes } from "./types.ts";

describe("normalize custom panes resolver", () => {
  it("preserves the custom pane resolver function reference", () => {
    const resolveCustomPanes: ResolvePhoneEditorCustomPanes = () => null;

    const normalized = normalizeCustomPanesResolver({ resolveCustomPanes });

    assert.ok(normalized);
    assert.equal(normalized.resolveCustomPanes, resolveCustomPanes);
  });
});

describe("normalizeEditorContentItems via registerPhoneApp", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("preserves multiline when true and omits when false or absent", () => {
    registerPhoneApp({
      id: "phone-test-multiline",
      render: () => null,
      styleEditor: {
        contentItems: [
          {
            id: "css-block",
            group: "样式",
            label: "CSS",
            fieldType: "string",
            defaultValue: "",
            multiline: true,
          },
          {
            id: "title",
            group: "样式",
            label: "标题",
            fieldType: "string",
            defaultValue: "",
            multiline: false,
          },
        ],
      },
    });

    const slot = (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY] as {
      queue: Array<{
        styleEditor?: { contentItems?: Array<{ id: string; multiline?: boolean }> };
      }>;
    };
    const items = slot.queue[0]?.styleEditor?.contentItems ?? [];

    assert.equal(items.find((item) => item.id === "css-block")?.multiline, true);
    assert.equal(items.find((item) => item.id === "title")?.multiline, undefined);
  });
});
