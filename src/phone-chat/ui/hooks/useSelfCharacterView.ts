/**
 * @file useSelfCharacterView.ts
 * @description React Hook：订阅角色表并解析作者配置的「我方」展示数据。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.1.0
 *
 * @remarks
 * 空 selfCharacterId 时不调用 `useCharacter("")`；用 `useAll()` 订阅资产变更。
 */

import type { ExtensionContext } from "@avg-studio/sdk";

import {
  resolveSelfCharacterView,
  type SelfCharacterView,
} from "../../domain/self-character";
import { getCachedAuthorSettings } from "../../runtime/settings";

/**
 * 读取缓存的「我方角色」并随角色资产更新刷新。
 *
 * @param ctx - 扩展上下文
 * @returns SelfCharacterView
 */
export function useSelfCharacterView(
  ctx: ExtensionContext,
): SelfCharacterView {
  ctx.character.useAll();
  const selfId = getCachedAuthorSettings().selfCharacterId;
  return resolveSelfCharacterView(ctx, selfId);
}
