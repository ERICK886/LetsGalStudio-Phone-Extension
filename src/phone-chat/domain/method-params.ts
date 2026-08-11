/**
 * @file method-params.ts
 * @description 从方法块 params 解析多条消息 / 回复。
 * @author 池水三两升
 * @date 2026-08-11
 * @version 0.3.0
 */

import type { BlockSchema } from "@avg-studio/sdk";

import {
  MAX_EFFECTS_PER_REPLY,
  MAX_MESSAGES_PER_METHOD,
  MAX_REPLIES_PER_METHOD,
} from "../constants.ts";
import { resolveMessageSlot } from "./message-content.ts";
import { nextId } from "./id.ts";
import type { AppendMessageInput } from "./threads";
import type { ChatMessageStatus, ChatReplyOption } from "../types/index";

function nonEmpty(value: unknown, max = 2000): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

/**
 * 将方法块布尔参数收敛为真正的 boolean（兼容 Studio 值封装与字符串）。
 *
 * @param value - 原始参数（可能是 boolean / `"false"` / `{ value }` 等）
 * @param defaultValue - `undefined` / `null` / 无法识别时的默认值
 * @returns 收敛后的布尔值
 *
 * @remarks
 * 若直接写 `params.openPhone !== false`，当 Studio 传入字符串 `"false"` 时
 * 仍会当成「要打开」，再叠加 `waitUntilClose` 会导致剧情卡在等待关手机。
 *
 * @example
 * ```ts
 * coerceMethodBoolean(false, true); // false
 * coerceMethodBoolean("false", true); // false
 * coerceMethodBoolean(undefined, true); // true
 * coerceMethodBoolean({ value: false }, true); // false
 * ```
 */
export function coerceMethodBoolean(
  value: unknown,
  defaultValue: boolean,
): boolean {
  let current: unknown = value;
  // Studio 历史封装：{ value } / { lit } / { literal }
  for (let depth = 0; depth < 3; depth += 1) {
    if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      "value" in (current as Record<string, unknown>)
    ) {
      current = (current as { value: unknown }).value;
      continue;
    }
    break;
  }

  if (current === undefined || current === null) return defaultValue;
  if (typeof current === "boolean") return current;
  if (typeof current === "number") {
    if (current === 0) return false;
    if (current === 1) return true;
    return defaultValue;
  }
  if (typeof current === "string") {
    const normalized = current.trim().toLowerCase();
    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no" ||
      normalized === "off"
    ) {
      return false;
    }
    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes" ||
      normalized === "on"
    ) {
      return true;
    }
    return defaultValue;
  }
  return defaultValue;
}

/**
 * 构造「对方发送消息」方法的消息槽（无方向/状态字段）。
 *
 * @returns BlockSchema 片段，含 message / message2 … 槽位
 *
 * @example
 * ```ts
 * const fields = buildFriendMessageSchemaFields();
 * // fields.contentType.default === "text"
 * ```
 */
export function buildFriendMessageSchemaFields(): BlockSchema {
  const fields: BlockSchema = {};
  for (let i = 1; i <= MAX_MESSAGES_PER_METHOD; i += 1) {
    const suffix = i === 1 ? "" : String(i);
    fields[`contentType${suffix}`] = {
      type: "enum",
      label: `对方第 ${i} 条 · 类型`,
      options: [
        { label: "文字", value: "text" },
        { label: "图片", value: "image" },
      ],
      default: "text",
    };
    fields[`message${suffix}`] = {
      type: "string",
      label: `对方第 ${i} 条 · 文字`,
      multiline: true,
    };
    fields[`imageAsset${suffix}`] = {
      type: "asset",
      label: `对方第 ${i} 条 · 图片`,
      assetType: "image",
    };
  }
  return fields;
}

/**
 * 解析对方消息槽；全部强制 incoming + read。
 * 空文本跳过；可返回空数组。
 *
 * @param params - 方法参数（message / message2 …）
 * @returns 规范化消息列表，direction 均为 incoming，status 均为 read
 *
 * @example
 * ```ts
 * parseFriendMessagesFromParams({ message: "你好" });
 * // [{ text: "你好", direction: "incoming", status: "read" }]
 * ```
 */
export function parseFriendMessagesFromParams(
  params: Record<string, unknown>,
): AppendMessageInput[] {
  const result: AppendMessageInput[] = [];
  for (let i = 1; i <= MAX_MESSAGES_PER_METHOD; i += 1) {
    const suffix = i === 1 ? "" : String(i);
    const slot = resolveMessageSlot({
      contentType: params[`contentType${suffix}`],
      text: params[`message${suffix}`],
      imageAsset: params[`imageAsset${suffix}`],
      textMax: 2000,
    });
    if (!slot) continue;
    result.push({
      text: slot.contentType === "text" ? slot.text : "",
      contentType: slot.contentType,
      ...(slot.contentType === "image" ? { imageAsset: slot.imageAsset } : {}),
      direction: "incoming",
      status: "read",
    });
  }
  return result;
}

/**
 * 解析回复选项槽（reply1… + effect 变量）。
 *
 * @param params - 方法参数
 * @returns 回复选项
 */
export function parseRepliesFromParams(
  params: Record<string, unknown>,
): ChatReplyOption[] {
  const result: ChatReplyOption[] = [];
  for (let i = 1; i <= MAX_REPLIES_PER_METHOD; i += 1) {
    const slot = resolveMessageSlot({
      contentType: params[`reply${i}ContentType`],
      text: params[`reply${i}`],
      imageAsset: params[`reply${i}Image`],
      textMax: 500,
    });
    if (!slot) continue;
    const effects = [];
    for (let e = 1; e <= MAX_EFFECTS_PER_REPLY; e += 1) {
      const variable = nonEmpty(params[`reply${i}Var${e}`], 120);
      if (!variable) continue;
      const value =
        typeof params[`reply${i}Val${e}`] === "string"
          ? String(params[`reply${i}Val${e}`])
          : params[`reply${i}Val${e}`] == null
            ? ""
            : String(params[`reply${i}Val${e}`]);
      effects.push({ variable, value });
    }
    result.push({
      id: nextId("reply"),
      text: slot.contentType === "text" ? slot.text : "",
      contentType: slot.contentType,
      ...(slot.contentType === "image" ? { imageAsset: slot.imageAsset } : {}),
      effects,
    });
  }
  return result;
}

/**
 * 我方消息状态白名单。
 *
 * @remarks
 * 与 `ChatMessageStatus` 保持同步，用于 `outgoingStatus` 字段校验。
 */
const OUTGOING_STATUS_WHITELIST: readonly ChatMessageStatus[] = [
  "sending",
  "unread",
  "read",
  "failed",
  "blocked",
];

/**
 * 将方法参数中的 `outgoingStatus` 归一化为合法 `ChatMessageStatus`。
 *
 * @param status - 原始方法参数值；缺省或非法时返回 `"read"`
 * @returns 归一化后的消息状态
 *
 * @example
 * ```ts
 * normalizeOutgoingStatus("sending"); // "sending"
 * normalizeOutgoingStatus(null);      // "read"
 * normalizeOutgoingStatus("invalid"); // "read"
 * ```
 */
export function normalizeOutgoingStatus(status: unknown): ChatMessageStatus {
  const s = String(status ?? "read");
  return (OUTGOING_STATUS_WHITELIST as readonly string[]).includes(s)
    ? (s as ChatMessageStatus)
    : "read";
}

/**
 * 构造回复槽 schema 字段。
 *
 * @returns BlockSchema 片段
 */
export function buildReplySchemaFields(): BlockSchema {
  const fields: BlockSchema = {};
  for (let i = 1; i <= MAX_REPLIES_PER_METHOD; i += 1) {
    fields[`reply${i}ContentType`] = {
      type: "enum",
      label: `玩家回复 ${i} · 类型`,
      options: [
        { label: "文字", value: "text" },
        { label: "图片", value: "image" },
      ],
      default: "text",
    };
    fields[`reply${i}`] = {
      type: "string",
      label: `玩家回复 ${i} · 文字`,
      multiline: true,
    };
    fields[`reply${i}Image`] = {
      type: "asset",
      label: `玩家回复 ${i} · 图片`,
      assetType: "image",
    };
    for (let e = 1; e <= MAX_EFFECTS_PER_REPLY; e += 1) {
      fields[`reply${i}Var${e}`] = {
        type: "variable",
        label: `玩家回复 ${i} · 效果${e} 变量`,
      };
      fields[`reply${i}Val${e}`] = {
        type: "string",
        label: `玩家回复 ${i} · 效果${e} 写入值`,
      };
    }
  }
  return fields;
}
