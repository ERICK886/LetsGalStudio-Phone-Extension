/**
 * @file effects.ts
 * @description 玩家回复「写变量」效果解析与执行。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import type { ExtensionContext, VariableValue } from "@avg-studio/sdk";
import type {
  ChatReplyEffect,
  ChatReplyEffectOperator,
} from "../types/index";

const EFFECT_OPERATORS = new Set<ChatReplyEffectOperator>([
  "=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
]);

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

/** 将旧存档或异常输入中的运算符归一化；缺省保持原有直接赋值行为。 */
export function normalizeReplyEffectOperator(
  value: unknown,
): ChatReplyEffectOperator {
  const operator = String(value ?? "=").trim() as ChatReplyEffectOperator;
  return EFFECT_OPERATORS.has(operator) ? operator : "=";
}

/**
 * 计算一条回复效果的最终写入值。
 *
 * `=` 接受全部变量类型；复合运算要求当前值和操作数都是有限数字。
 */
export function calculateReplyEffectValue(
  current: VariableValue | undefined,
  operator: ChatReplyEffectOperator,
  operand: VariableValue,
): VariableValue {
  if (operator === "=") return operand;
  if (
    typeof current !== "number" ||
    !Number.isFinite(current) ||
    typeof operand !== "number" ||
    !Number.isFinite(operand)
  ) {
    throw new TypeError(`${operator} 只能用于两个有限数字`);
  }
  if ((operator === "/=" || operator === "%=") && operand === 0) {
    throw new RangeError(`${operator} 的操作数不能为 0`);
  }

  const result =
    operator === "+="
      ? current + operand
      : operator === "-="
        ? current - operand
        : operator === "*="
          ? current * operand
          : operator === "/="
            ? current / operand
            : current % operand;
  if (!Number.isFinite(result)) {
    throw new RangeError(`${operator} 的计算结果不是有限数字`);
  }
  return result;
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
      const operator = normalizeReplyEffectOperator(effect.operator);
      const operand = parseEffectValue(effect.value);
      const current = operator === "=" ? undefined : ctx.variables.get(name);
      ctx.variables.set(
        name,
        calculateReplyEffectValue(current, operator, operand),
      );
    } catch (error) {
      console.error(
        `[phone-chat] 回复效果 ${name} ${normalizeReplyEffectOperator(effect.operator)} ${effect.value} 执行失败`,
        error,
      );
    }
  }
}
