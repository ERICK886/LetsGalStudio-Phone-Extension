/**
 * @file useCharacterView.ts
 * @description React Hook：订阅角色资产并得到展示用 name / avatar / glyph。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import {
  resolveAssetUrl,
  firstGlyph,
  type CharacterView,
} from "../../domain/character";

/**
 * 订阅角色资产变化，供列表行 / 气泡复用。
 *
 * @param ctx - 扩展上下文（内页为宿主 context，仍可读 character）
 * @param characterId - 角色资产 ID
 * @returns CharacterView
 *
 * @example
 * ```tsx
 * const view = useCharacterView(ctx, friendId);
 * ```
 */
export function useCharacterView(
  ctx: ExtensionContext,
  characterId: string,
): CharacterView {
  const character = ctx.character.useCharacter(characterId);
  const name = (character?.name ?? characterId) || "未知";
  const uri = character?.avatarUri ?? character?.portraits?.[0]?.uri;
  return {
    name,
    avatarUrl: resolveAssetUrl(ctx, uri),
    glyph: firstGlyph(name),
  };
}
