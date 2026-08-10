/**
 * @file character.ts
 * @description 角色资产 → 显示名 / 头像 URL（纯函数，无 React）。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";

/**
 * 将 Studio 素材 URI 转为可赋给 <img> 的 URL。
 *
 * @param ctx - 扩展上下文
 * @param source - 素材 URI / local:// / data URL
 * @returns URL；失败返回 undefined
 *
 * @example
 * ```ts
 * const url = resolveAssetUrl(ctx, character?.avatarUri);
 * ```
 */
export function resolveAssetUrl(
  ctx: ExtensionContext,
  source?: string,
): string | undefined {
  if (!source) return undefined;
  if (source.startsWith("data:image/") || source.startsWith("local://")) {
    return source;
  }
  try {
    return ctx.asset.resolve(source).url;
  } catch (error) {
    console.warn("[chat] 无法解析头像素材", source, error);
    return undefined;
  }
}

/**
 * 取名称首字作头像占位。
 *
 * @param value - 显示名
 * @returns 单个字符
 */
export function firstGlyph(value: string): string {
  return Array.from(value.trim())[0]?.toUpperCase() ?? "?";
}

/** 列表 / 气泡共用的角色展示数据。 */
export interface CharacterView {
  name: string;
  avatarUrl?: string;
  glyph: string;
}

/**
 * 命令式解析角色显示信息（方法 / 非 React 路径用 `get`）。
 *
 * @param ctx - 扩展上下文
 * @param characterId - 角色资产 ID
 * @returns CharacterView
 */
export function resolveCharacterView(
  ctx: ExtensionContext,
  characterId: string,
): CharacterView {
  const character = ctx.character.get(characterId);
  const name = (character?.name ?? characterId) || "未知";
  const uri = character?.avatarUri ?? character?.portraits?.[0]?.uri;
  return {
    name,
    avatarUrl: resolveAssetUrl(ctx, uri),
    glyph: firstGlyph(name),
  };
}
