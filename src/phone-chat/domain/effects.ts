/**
 * @file effects.ts
 * @description 玩家回复「写变量」效果解析与执行。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import type { ExtensionContext } from "@avg-studio/sdk";
import type { ChatReplyEffect } from "../types/index";

/**
 * 将作者填写的字符串值解析为变量可接受的类型。
 *
 * @param raw - 原始字符串
 * @returns string | number | boolean | null
 */
export function parseEffectValue(
  raw: string,
): string | number | boolean | null {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return raw;
}

/**
 * 依次写入变量效果。
 *
 * @param ctx - 扩展上下文
 * @param effects - 效果列表
 */
export function applyReplyEffects(
  ctx: ExtensionContext,
  effects: readonly ChatReplyEffect[],
): void {
  for (const effect of effects) {
    const name = effect.variable.trim();
    if (!name) continue;
    try {
      ctx.variables.set(name, parseEffectValue(effect.value));
    } catch (error) {
      console.error(`[phone-chat] 写入回复变量 ${name} 失败`, error);
    }
  }
}
