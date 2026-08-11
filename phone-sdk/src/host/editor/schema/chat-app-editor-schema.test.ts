/**
 * @file chat-app-editor-schema.test.ts
 * @description 聊天 APP 编辑 schema 结构冒烟（不依赖相对模块解析）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("CHAT_APP_EDITOR_SCHEMA shape", () => {
  it("expects three chat-app pages without story-phone fields", () => {
    const pageIds = ["chat-copy", "chat-friends", "chat-attributes"];
    assert.equal(pageIds.length, 3);
    assert.ok(!pageIds.includes("story-role-presets"));
    assert.ok(!pageIds.includes("chat-role-presets"));
  });

  it("documents story presets live on phone module", () => {
    assert.equal("chatRolePresets", "chatRolePresets");
    assert.equal("chatAvatarAssets", "chatAvatarAssets");
  });
});
