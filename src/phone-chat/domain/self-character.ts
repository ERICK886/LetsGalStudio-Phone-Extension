/**
 * @file self-character.ts
 * @description 作者配置的「我方角色」→ 会话内展示数据。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import { resolveCharacterView } from "./character.ts";

/** 会话内「我方」展示数据。 */
export interface SelfCharacterView {
  characterId: string;
  /** 空配置时为「我」。 */
  displayName: string;
  glyph: string;
  avatarUrl?: string;
}

/**
 * 解析我方角色展示信息。
 *
 * @param ctx - 扩展上下文
 * @param selfCharacterId - 作者设置中的角色 ID（可含空白）
 * @returns SelfCharacterView
 */
export function resolveSelfCharacterView(
  ctx: ExtensionContext,
  selfCharacterId: string,
): SelfCharacterView {
  const characterId = selfCharacterId.trim();
  if (!characterId) {
    return {
      characterId: "",
      displayName: "我",
      glyph: "我",
      avatarUrl: undefined,
    };
  }

  const view = resolveCharacterView(ctx, characterId);
  return {
    characterId,
    displayName: view.name,
    glyph: view.glyph,
    avatarUrl: view.avatarUrl,
  };
}
