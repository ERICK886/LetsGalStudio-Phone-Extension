/**
 * @file settings-fields.ts
 * @description 聊天内页作者设置字段工厂：返回带 `chat` 前缀的字段定义，
 *              供宿主 `StudioPhoneExtension` 在 `static settings` 中合并。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 字段名一律以 `chat` 前缀（如 `chatAppTitle`、`chatDefaultFriends`），
 *   避免与宿主手机壳字段（`phoneTitle` 等）或将来迁入的相册字段冲突。
 * - `runtime/settings.ts` 的 `readAuthorSettings` 必须以相同前缀读取。
 * - 函数签名接收 `SettingsBuilder`，返回字段映射；不在本模块调用 `settings()`。
 */

import type { SettingsBuilder, AnyFieldBuilder } from "@avg-studio/sdk";

/**
 * 构造聊天内页作者设置字段（带 `chat` 前缀）。
 *
 * @param s - 宿主传入的 `SettingsBuilder`（即 `settings((s) => …)` 中的 `s`）
 * @returns 字段名 → 字段构建器，供宿主合并到 `static settings`
 *
 * @example
 * ```ts
 * static settings = settings((s) => ({
 *   ...buildPhoneHostSettingsFields(s),
 *   ...buildChatSettingsFields(s),
 * }));
 * ```
 */
export function buildChatSettingsFields(
  s: SettingsBuilder,
): Record<string, AnyFieldBuilder> {
  return {
    chatAppTitle: s.string("应用标题").default("聊天"),
    chatChatsTabLabel: s.string("聊天 Tab 名称").default("聊天"),
    chatFriendsTabLabel: s.string("好友 Tab 名称").default("好友"),
    chatEmptyChatsHint: s
      .string("聊天列表空提示")
      .default("暂无聊天，剧情推送消息后会出现在这里"),
    chatEmptyFriendsHint: s
      .string("好友列表空提示")
      .default("暂无好友，请在扩展设置添加默认好友或用方法添加"),
    chatDefaultFriends: s
      .array("默认好友", (item) => ({
        characterId: item.character("角色"),
      }))
      .itemDefault({ characterId: "" })
      .maxItems(80)
      .addLabel("添加默认好友")
      .emptyHint("未配置时好友列表为空，可用「添加好友」方法动态加入。")
      .describe(
        "开局出现在好友与可聊名单中的角色。名字与立绘读角色资产；详情属性值读变量。",
      ),
    chatAttributeFields: s
      .array("好友详情属性槽", (item) => ({
        id: item.string("槽位 ID").default("mood"),
        label: item.string("显示名称").default("心情"),
        variableKey: item
          .string("变量名")
          .default("friend.{characterId}.mood")
          .describe(
            "支持占位 {characterId}，运行时替换为好友角色 ID 后 ctx.variables.get。",
          ),
      }))
      .itemDefault({
        id: "mood",
        label: "心情",
        variableKey: "friend.{characterId}.mood",
      })
      .maxItems(40)
      .addLabel("添加属性行")
      .emptyHint("不配置则详情页只显示头像与名字。")
      .describe(
        "仅声明显示哪些行与显示名；具体值完全由变量决定，不在此填写。",
      ),
  };
}
