/**
 * @file resolve-editor-section-schema.test.ts
 * @description resolveCustomPanes 转发与 buildSectionSchemaFromStyleEditor 单测。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PhoneAppRegistration } from "../../../client/runtime/types.ts";
import { buildSectionSchemaFromStyleEditor } from "./build-section-schema-from-style-editor.ts";

function sampleApp(
  overrides: Partial<PhoneAppRegistration> = {},
): PhoneAppRegistration {
  return {
    id: "phone-album",
    render: () => null,
    styleEditor: {
      contentItems: [
        {
          id: "albumTitle",
          group: "文案",
          label: "标题",
          fieldType: "string",
          defaultValue: "",
        },
      ],
      pages: [{ id: "home-copy", label: "首页文案", status: "ready" }],
    },
    ...overrides,
  };
}

describe("buildSectionSchemaFromStyleEditor", () => {
  it("forwards resolveCustomPanes by the same function reference", () => {
    const fn = () => null;
    const schema = buildSectionSchemaFromStyleEditor(
      sampleApp({
        styleEditor: {
          contentItems: sampleApp().styleEditor!.contentItems!,
          pages: sampleApp().styleEditor!.pages!,
          resolveCustomPanes: fn,
        },
      }),
    );

    assert.ok(schema);
    assert.equal(schema!.sectionId, "phone-album");
    assert.equal(schema!.settingsModuleId, "phone-album");
    assert.equal(schema!.resolveCustomPanes, fn);
  });

  it("returns null when pages or contentItems are missing", () => {
    assert.equal(
      buildSectionSchemaFromStyleEditor(
        sampleApp({ styleEditor: { pages: [], contentItems: [] } }),
      ),
      null,
    );
    assert.equal(
      buildSectionSchemaFromStyleEditor(sampleApp({ styleEditor: undefined })),
      null,
    );
  });

  it("uses trimmed settingsModuleId when provided", () => {
    const schema = buildSectionSchemaFromStyleEditor(
      sampleApp({
        styleEditor: {
          ...sampleApp().styleEditor!,
          settingsModuleId: "  phone-album  ",
        },
      }),
    );

    assert.equal(schema!.settingsModuleId, "phone-album");
  });

  it("copies contentItems and pages arrays", () => {
    const app = sampleApp();
    const schema = buildSectionSchemaFromStyleEditor(app);

    assert.notEqual(schema!.contentItems, app.styleEditor!.contentItems);
    assert.notEqual(schema!.pages, app.styleEditor!.pages);
    assert.deepEqual(schema!.contentItems, app.styleEditor!.contentItems);
    assert.deepEqual(schema!.pages, app.styleEditor!.pages);
  });
});
