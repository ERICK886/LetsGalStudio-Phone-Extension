/**
 * @file settings-fields.ts
 * @description 聊天模块作者设置字段（本模块独立 settings，无需 chat 前缀）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 */

import type { SettingsBuilder, AnyFieldBuilder } from "@avg-studio/sdk";

/**
 * 构造聊天模块作者设置字段。
 *
 * @param s - `settings((s) => …)` 中的 builder
 * @returns 字段映射
 */
export function buildChatSettingsFields(
  s: SettingsBuilder,
): Record<string, AnyFieldBuilder> {
  return {
    selfCharacterId: s
      .character("我方角色")
      .describe("未选择时会话内显示为「我」。")
      .default(""),
    appTitle: s.string("应用标题").default("聊天"),
    chatsTabLabel: s.string("聊天 Tab 名称").default("聊天"),
    friendsTabLabel: s.string("好友 Tab 名称").default("好友"),
    emptyChatsHint: s
      .string("聊天列表空提示")
      .default("暂无聊天，剧情推送消息后会出现在这里"),
    emptyFriendsHint: s
      .string("好友列表空提示")
      .default("暂无好友，请在扩展设置添加默认好友或用方法添加"),
    defaultFriends: s
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
    defaultGroups: s
      .array("默认群聊", (item) => ({
        groupId: item.string("群 ID").default("group-1"),
        title: item.string("群名称").default("群聊"),
        avatarAsset: item.asset("群头像").accepts("image"),
        member1: item.character("成员 1"),
        member2: item.character("成员 2"),
        member3: item.character("成员 3"),
        member4: item.character("成员 4"),
        member5: item.character("成员 5"),
        member6: item.character("成员 6"),
        member7: item.character("成员 7"),
        member8: item.character("成员 8"),
      }))
      .itemDefault({
        groupId: "group-1",
        title: "群聊",
        avatarAsset: "",
        member1: "",
        member2: "",
        member3: "",
        member4: "",
        member5: "",
        member6: "",
        member7: "",
        member8: "",
      })
      .maxItems(40)
      .addLabel("添加群聊")
      .emptyHint("未配置群聊时，群聊方法仍可按群 ID 建立临时会话。")
      .describe("群 ID 必须稳定且唯一；成员用于群聊资料和发送者校验。"),
    attributeFields: s
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
