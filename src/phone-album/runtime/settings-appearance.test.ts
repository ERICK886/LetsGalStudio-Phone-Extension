/**
 * @file settings-appearance.test.ts
 * @description 相册外观 settings 纯解析单测。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ALBUM_APPEARANCE,
  parseAppearanceFromSettings,
} from "./appearance-parse.ts";

describe("parseAppearanceFromSettings", () => {
  it("returns defaults for empty input", () => {
    assert.deepEqual(parseAppearanceFromSettings({}), DEFAULT_ALBUM_APPEARANCE);
  });

  it("passes through valid colors and css", () => {
    const raw = {
      styleBg: "#111111",
      styleFg: "#EEEEEE",
      styleCustomCss: ".pa-root { opacity: 1; }",
    };
    const parsed = parseAppearanceFromSettings(raw);
    assert.equal(parsed.styleBg, "#111111");
    assert.equal(parsed.styleFg, "#EEEEEE");
    assert.equal(parsed.styleCustomCss, ".pa-root { opacity: 1; }");
    assert.equal(parsed.styleAccent, DEFAULT_ALBUM_APPEARANCE.styleAccent);
  });

  it("falls back empty color to default", () => {
    const parsed = parseAppearanceFromSettings({ styleBg: "   " });
    assert.equal(parsed.styleBg, DEFAULT_ALBUM_APPEARANCE.styleBg);
  });

  it("falls back illegal home columns enum", () => {
    assert.equal(
      parseAppearanceFromSettings({ styleHomeColumns: "5" }).styleHomeColumns,
      "2",
    );
    assert.equal(
      parseAppearanceFromSettings({ styleHomeColumns: "3" }).styleHomeColumns,
      "3",
    );
  });

  it("falls back illegal grid columns enum", () => {
    assert.equal(
      parseAppearanceFromSettings({ styleGridColumns: "2" }).styleGridColumns,
      "3",
    );
    assert.equal(
      parseAppearanceFromSettings({ styleGridColumns: "4" }).styleGridColumns,
      "4",
    );
  });

  it("falls back illegal radius and gap enums", () => {
    assert.equal(
      parseAppearanceFromSettings({ styleRadius: "xl" }).styleRadius,
      "md",
    );
    assert.equal(
      parseAppearanceFromSettings({ styleCardGap: "huge" }).styleCardGap,
      "md",
    );
    assert.equal(
      parseAppearanceFromSettings({ styleRadius: "sm" }).styleRadius,
      "sm",
    );
  });

  it("parses styleShowTabLabels boolean with fallback", () => {
    assert.equal(
      parseAppearanceFromSettings({ styleShowTabLabels: false })
        .styleShowTabLabels,
      false,
    );
    assert.equal(
      parseAppearanceFromSettings({ styleShowTabLabels: "false" })
        .styleShowTabLabels,
      false,
    );
    assert.equal(
      parseAppearanceFromSettings({ styleShowTabLabels: "true" })
        .styleShowTabLabels,
      true,
    );
    assert.equal(
      parseAppearanceFromSettings({ styleShowTabLabels: "maybe" })
        .styleShowTabLabels,
      DEFAULT_ALBUM_APPEARANCE.styleShowTabLabels,
    );
  });
});
