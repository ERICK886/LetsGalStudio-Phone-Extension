import assert from "node:assert/strict";
import { it } from "node:test";
import { builtinEditorPage } from "./builtin-editor-page.ts";
import { resolveEditorSectionSchema } from "./resolve-editor-section-schema.ts";
import { registerPhoneApp } from "../../../client/runtime/register.ts";
import { PHONE_SDK_GLOBAL_KEY } from "../../../client/runtime/slot.ts";

it("third-party page IDs cannot select the phone/chat settings adapters", () => {
  for (const page of ["desktop-apps", "chat-friends", "chat-groups", "chat-attributes", "story-role-presets"]) {
    assert.equal(builtinEditorPage("third-party", page), undefined);
  }
  assert.equal(builtinEditorPage("phone", "desktop-apps"), "desktop");
  assert.equal(builtinEditorPage("phone-chat", "chat-friends"), "chat");
  assert.equal(builtinEditorPage("phone", "story-role-presets"), "chat");
});

it("chat editor schema comes from the registered app including custom panes", () => {
  delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  const panes = () => null;
  registerPhoneApp({ id: "phone-chat", render: () => null, styleEditor: {
    settingsModuleId: "my-chat", pages: [{ id: "custom", label: "Custom" }], resolveCustomPanes: panes,
  } });
  const schema = resolveEditorSectionSchema("phone-chat");
  assert.equal(schema.settingsModuleId, "my-chat");
  assert.equal(schema.pages[0].id, "custom");
  assert.equal(schema.resolveCustomPanes, panes);
});
