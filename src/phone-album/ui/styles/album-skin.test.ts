/**
 * @file album-skin.test.ts
 * @description album-skin 映射 / 消毒 / 注入单测。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DEFAULT_ALBUM_APPEARANCE } from "../../runtime/appearance-parse.ts";
import type { AlbumAppearanceSettings } from "../../types.ts";
import {
  ALBUM_SKIN_DEFAULTS,
  buildAlbumSkinCssVars,
  buildAlbumSkinDataAttrs,
  clearAuthorCss,
  ensureAuthorCss,
  mapGapPx,
  mapRadiusPx,
  sanitizeAuthorCss,
  wrapAuthorCss,
} from "./album-skin.ts";

const AUTHOR_CSS_SELECTOR = 'style[data-pa-author-css="phone-album"]';

class MockStyleElement {
  tagName = "STYLE";
  private attrs = new Map<string, string>();
  textContent = "";
  parent: MockHead | null = null;

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  remove(): void {
    this.parent?.removeChild(this);
  }
}

class MockHead {
  children: MockStyleElement[] = [];

  appendChild(el: MockStyleElement): MockStyleElement {
    el.parent = this;
    this.children.push(el);
    return el;
  }

  removeChild(el: MockStyleElement): void {
    this.children = this.children.filter((child) => child !== el);
    el.parent = null;
  }

  querySelector(selector: string): MockStyleElement | null {
    if (selector !== AUTHOR_CSS_SELECTOR) return null;
    return (
      this.children.find(
        (el) =>
          el.tagName === "STYLE" &&
          el.getAttribute("data-pa-author-css") === "phone-album",
      ) ?? null
    );
  }
}

describe("ALBUM_SKIN_DEFAULTS", () => {
  it("matches DEFAULT_ALBUM_APPEARANCE", () => {
    assert.deepEqual(ALBUM_SKIN_DEFAULTS, DEFAULT_ALBUM_APPEARANCE);
  });
});

describe("mapRadiusPx / mapGapPx", () => {
  it("maps radius sm/md/lg to 8/12/16", () => {
    assert.equal(mapRadiusPx("sm"), 8);
    assert.equal(mapRadiusPx("md"), 12);
    assert.equal(mapRadiusPx("lg"), 16);
  });

  it("maps gap sm/md/lg to 6/10/14", () => {
    assert.equal(mapGapPx("sm"), 6);
    assert.equal(mapGapPx("md"), 10);
    assert.equal(mapGapPx("lg"), 14);
  });
});

describe("sanitizeAuthorCss", () => {
  it("strips </style>, @import, and <script (case insensitive)", () => {
    const raw =
      "color:red;</style>@IMPORT url(x);<SCRIPT>alert(1)</script>.pa-root{color:blue}";
    const out = sanitizeAuthorCss(raw);
    assert.ok(!out.includes("</style>"));
    assert.ok(!/import/i.test(out));
    assert.ok(!/<script/i.test(out));
    assert.match(out, /\.pa-root\{color:blue\}/);
  });
});

describe("wrapAuthorCss", () => {
  it("wraps declaration fragments without {", () => {
    const wrapped = wrapAuthorCss("color: red; padding: 4px;");
    assert.match(wrapped, /\.pa-root\[data-pa-author-skin\]/);
    assert.match(wrapped, /color: red/);
    assert.doesNotMatch(wrapped, /^\.pa-root\{color/);
  });

  it("passes through full rules when { is present", () => {
    const css = ".pa-root .pa-card { border: 1px solid red; }";
    assert.equal(wrapAuthorCss(css), css);
  });
});

describe("buildAlbumSkinCssVars", () => {
  it("maps appearance to --pa-* vars and numeric columns", () => {
    const appearance: AlbumAppearanceSettings = {
      ...DEFAULT_ALBUM_APPEARANCE,
      styleBg: "#111111",
      styleHomeColumns: "3",
      styleGridColumns: "4",
      styleRadius: "lg",
      styleCardGap: "sm",
    };
    const vars = buildAlbumSkinCssVars(appearance);
    assert.equal(vars["--pa-bg"], "#111111");
    assert.equal(vars["--pa-home-columns"], "3");
    assert.equal(vars["--pa-grid-columns"], "4");
    assert.equal(vars["--pa-radius"], "16px");
    assert.equal(vars["--pa-gap"], "6px");
  });
});

describe("buildAlbumSkinDataAttrs", () => {
  it("sets tab labels and author-skin marker", () => {
    assert.deepEqual(
      buildAlbumSkinDataAttrs({
        ...DEFAULT_ALBUM_APPEARANCE,
        styleShowTabLabels: false,
        styleCustomCss: "",
      }),
      { "data-pa-tab-labels": "0" },
    );

    assert.deepEqual(
      buildAlbumSkinDataAttrs({
        ...DEFAULT_ALBUM_APPEARANCE,
        styleShowTabLabels: true,
        styleCustomCss: "color: red;",
      }),
      { "data-pa-tab-labels": "1", "data-pa-author-skin": "" },
    );
  });
});

describe("ensureAuthorCss / clearAuthorCss", () => {
  let head: MockHead;
  let originalDocument: typeof globalThis.document | undefined;

  beforeEach(() => {
    head = new MockHead();
    originalDocument = globalThis.document;
    globalThis.document = {
      head,
      createElement: () => new MockStyleElement(),
    } as unknown as Document;
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      // @ts-expect-error test cleanup
      delete globalThis.document;
    } else {
      globalThis.document = originalDocument;
    }
  });

  it("creates, updates, and removes author style tag", () => {
    ensureAuthorCss("color: red;");
    assert.equal(head.children.length, 1);
    const first = head.children[0]!;
    assert.equal(first.getAttribute("data-pa-author-css"), "phone-album");
    assert.match(first.textContent, /color: red/);

    ensureAuthorCss(".pa-root { opacity: 0.9; }");
    assert.equal(head.children.length, 1);
    assert.equal(head.children[0], first);
    assert.match(first.textContent, /opacity: 0\.9/);

    ensureAuthorCss("");
    assert.equal(head.children.length, 0);

    ensureAuthorCss("padding: 2px;");
    assert.equal(head.children.length, 1);

    clearAuthorCss();
    assert.equal(head.children.length, 0);
  });
});
