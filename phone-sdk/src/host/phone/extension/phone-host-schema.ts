/**
 * @file phone-host-schema.ts
 * @description 手机壳设置 / 存档字段工厂，供 PhoneExtension 与宿主包装类显式合并。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.5.5
 */

import {
  INTERNAL_SYSTEM_SLOT,
  type AnyFieldBuilder,
  type SettingsBuilder,
} from "@avg-studio/sdk";
import {
  type PhoneAppAvailabilityOverride,
  type PlayerPhonePreferences,
} from "../catalog";
import {
  DEFAULT_CHAT_ROLE_BUBBLE_COLOR,
  DEFAULT_CHAT_ROLE_CUSTOM_CSS,
  DEFAULT_CHAT_ROLE_FONT_SIZE,
  DEFAULT_CHAT_ROLE_NAME_COLOR,
  DEFAULT_CHAT_ROLE_TEXT_COLOR,
} from "./chat-role-bubble-style";

const DEFAULT_OPEN_PHONE_SHORTCUT = "ArrowUp";

const PHONE_POPUP_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "center",
] as const;

const CHAT_ROLE_AVATAR_SOURCES = [
  "first-portrait",
  "character-avatar",
  "asset",
] as const;

const LOCAL_COMMAND_IDS = [
  "quick-save",
  "quick-load",
  "toggle-fullscreen",
] as const;

const SYSTEM_SLOT_IDS = [
  INTERNAL_SYSTEM_SLOT.Title,
  INTERNAL_SYSTEM_SLOT.Toolbar,
  INTERNAL_SYSTEM_SLOT.Save,
  INTERNAL_SYSTEM_SLOT.Load,
  INTERNAL_SYSTEM_SLOT.Settings,
  INTERNAL_SYSTEM_SLOT.History,
  INTERNAL_SYSTEM_SLOT.Gallery,
] as const;

export function buildPhoneHostSettingsFields(
  s: SettingsBuilder,
): Record<string, AnyFieldBuilder> {
  return {
    phoneTitle: s.string("手机标题").default("手机"),
    openPhoneShortcut: s
      .shortcut("打开手机快捷键")
      .default(DEFAULT_OPEN_PHONE_SHORTCUT)
      .describe(
        "普通手机未显示时用于打开手机的默认按键，例如 ArrowUp、KeyP 或 Ctrl+KeyP。消息手机显示时不会触发打开。",
      ),
    phoneStylePreset: s
      .enum("手机样式预设", ["apple", "android"] as const)
      .default("apple")
      .labels({
        apple: "苹果手机（iPhone）",
        android: "安卓手机（Android）",
      })
      .describe(
        "切换手机外壳、顶部开孔/听筒、圆角、应用气泡，以及打开/关闭手机内页应用的过渡动画（苹果：从图标放大；安卓：自下而上升起）。背景、强调色和外壳颜色仍使用下方作者设置。",
      ),
    popupPosition: s
      .enum("手机弹出位置", PHONE_POPUP_POSITIONS)
      .default("bottom-right")
      .labels({
        "top-left": "左上",
        "top-center": "中上",
        "top-right": "右上",
        "bottom-left": "左下",
        "bottom-center": "中下",
        "bottom-right": "右下",
        center: "中部",
      })
      .describe(
        "选择手机贴近视口的弹出位置；打开时从该方向滑入并淡入，关闭时反向滑出。",
      ),
    chatAvatarAssets: s
      .array("聊天头像素材库", (item) => ({
        id: item.string("素材 ID").default("new-chat-avatar"),
        asset: item.asset("头像素材").accepts("image"),
      }))
      .itemDefault({ id: "new-chat-avatar" })
      .maxItems(80)
      .addLabel("添加头像素材")
      .emptyHint("仅在聊天角色使用“新扩展素材”头像时添加。")
      .describe(
        "自定义头像集中在此处选择，避免素材预览撑高聊天角色预设表格。记录素材 ID 后，将它填入对应角色预设的“头像素材 ID”。",
      ),
    chatRolePresets: s
      .array("聊天角色预设", (item) => ({
        id: item.string("预设 ID").default("new-chat-role"),
        characterId: item.character("资产角色"),
        avatarSource: item
          .enum("头像来源", CHAT_ROLE_AVATAR_SOURCES)
          .default("first-portrait")
          .labels({
            "first-portrait": "第一张立绘（默认）",
            "character-avatar": "角色默认头像",
            asset: "扩展素材库",
          }),
        avatarAssetId: item.string("头像素材 ID").default(""),
        showAvatar: item.boolean("显示头像").default(true),
        showName: item.boolean("显示名称").default(true),
        fontSize: item
          .string("字体大小")
          .default(DEFAULT_CHAT_ROLE_FONT_SIZE)
          .describe("对应气泡正文默认字号；清空后回退样式表默认。"),
        textColor: item
          .string("文字颜色")
          .default(DEFAULT_CHAT_ROLE_TEXT_COLOR)
          .describe("正文色，支持 hex 或 rgba()；清空后回退样式表默认。"),
        nameColor: item
          .string("名称颜色")
          .default(DEFAULT_CHAT_ROLE_NAME_COLOR)
          .describe("名称色，支持 hex 或 rgba()；清空后回退样式表默认。"),
        bubbleColor: item
          .string("对话框颜色")
          .default(DEFAULT_CHAT_ROLE_BUBBLE_COLOR)
          .describe(
            "气泡背景（对方消息默认值）。填写后我方消息也使用该背景，不再使用强调色混合。清空后回退样式表默认。",
          ),
        customCss: item
          .string("自定义 CSS")
          .multiline()
          .default("")
          .describe(
            [
              "新建不预填；留空即用样式表默认。",
              "占位示例：",
              DEFAULT_CHAT_ROLE_CUSTOM_CSS,
              "。仅写声明列表（如 padding / border-radius），勿写选择器/花括号/url()。",
              "与上方结构化字段同时存在时，自定义 CSS 优先。",
            ].join(""),
          ),
      }))
      .itemDefault({
        id: "new-chat-role",
        avatarSource: "first-portrait",
        avatarAssetId: "",
        showAvatar: true,
        showName: true,
        fontSize: DEFAULT_CHAT_ROLE_FONT_SIZE,
        textColor: DEFAULT_CHAT_ROLE_TEXT_COLOR,
        nameColor: DEFAULT_CHAT_ROLE_NAME_COLOR,
        bubbleColor: DEFAULT_CHAT_ROLE_BUBBLE_COLOR,
        customCss: "",
      })
      .maxItems(80)
      .addLabel("添加聊天角色预设")
      .emptyHint("未配置聊天角色预设时，显示手机消息会跳过对应消息。")
      .describe(
        "每条预设绑定一个项目资产角色。消息块填写预设 ID。「显示头像 / 显示名称」默认开启。show-message 方法块另有两个组级枚举（跟随预设 / 显示 / 隐藏，默认跟随预设），作用于本组全部消息且优先于预设。气泡样式字号与颜色默认填入与手机 CSS 一致的值；自定义 CSS 新建为空（示例见字段说明），填写后优先于结构化颜色与字号。清空任一字段即该字段回退样式表默认（含对方/我方气泡差异）。样式在 show-message 展开时写入消息快照。只有选择“扩展素材库”时，才需要填写上方素材库的素材 ID。",
      ),
    programUiActions: s
      .array("动作 · 程序 UI", (item) => ({
        id: item.string("ID").default("new-program-ui"),
        name: item.string("名称").default("新程序界面"),
        programUiRef: item
          .string("UI 引用")
          .describe("本扩展填 ui-id；跨扩展填 extension-id/ui-id，不要加 @。"),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-program-ui",
        name: "新程序界面",
        programUiRef: "",
        description: "",
      })
      .maxItems(40)
      .addLabel("添加程序 UI 动作")
      .emptyHint("没有程序 UI 动作。")
      .describe(
        "操作：①点击“添加程序 UI 动作”；②填写唯一 ID 和名称；③本扩展 UI 填 ui-id，跨扩展填 extension-id/ui-id（不要加 @）；④在“手机应用目录”的默认动作 ID 中填写同一 ID。",
      ),
    visualUiActions: s
      .array("动作 · 可视化 UI", (item) => ({
        id: item.string("ID").default("new-visual-ui"),
        name: item.string("名称").default("新可视化界面"),
        visualUiName: item
          .string("界面名称")
          .describe("项目界面填 ui-name；扩展界面填 @extension-id/ui-name。"),
        modal: item.boolean("模态").default(true),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-visual-ui",
        name: "新可视化界面",
        visualUiName: "",
        modal: true,
        description: "",
      })
      .maxItems(40)
      .addLabel("添加可视化 UI 动作")
      .emptyHint("没有可视化 UI 动作。")
      .describe(
        "操作：①点击“添加可视化 UI 动作”；②填写唯一 ID 和名称；③项目界面填 ui-name，扩展界面填 @extension-id/ui-name；④按需开启模态；⑤在应用目录中绑定该 ID。",
      ),
    systemSlotActions: s
      .array("动作 · 内置系统界面", (item) => ({
        id: item.string("ID").default("new-system-ui"),
        name: item.string("名称").default("新系统界面"),
        systemSlot: item
          .enum("系统界面", SYSTEM_SLOT_IDS)
          .default(INTERNAL_SYSTEM_SLOT.Settings)
          .labels({
            [INTERNAL_SYSTEM_SLOT.Title]: "标题画面",
            [INTERNAL_SYSTEM_SLOT.Toolbar]: "对话工具栏",
            [INTERNAL_SYSTEM_SLOT.Save]: "存档界面",
            [INTERNAL_SYSTEM_SLOT.Load]: "读档界面",
            [INTERNAL_SYSTEM_SLOT.Settings]: "设置界面",
            [INTERNAL_SYSTEM_SLOT.History]: "历史记录",
            [INTERNAL_SYSTEM_SLOT.Gallery]: "鉴赏界面",
          }),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-system-ui",
        name: "新系统界面",
        systemSlot: INTERNAL_SYSTEM_SLOT.Settings,
        description: "",
      })
      .maxItems(40)
      .addLabel("添加系统界面动作")
      .emptyHint("没有额外的系统界面动作。")
      .describe(
        "操作：①点击“添加系统界面动作”；②填写唯一 ID 和名称；③从下拉框选择标题、存档、读档、设置、历史或鉴赏界面；④在应用目录中绑定该 ID。",
      ),
    internalMethodActions: s
      .array("动作 · 手机内部方法", (item) => ({
        id: item.string("ID").default("new-internal-method"),
        name: item.string("名称").default("新内部方法"),
        commandId: item
          .enum("内部方法", LOCAL_COMMAND_IDS)
          .default("quick-save")
          .labels({
            "quick-save": "快速存档",
            "quick-load": "快速读档",
            "toggle-fullscreen": "切换全屏",
          }),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-internal-method",
        name: "新内部方法",
        commandId: "quick-save",
        description: "",
      })
      .maxItems(40)
      .addLabel("添加内部方法动作")
      .emptyHint("没有额外的手机内部方法动作。")
      .describe(
        "操作：①点击“添加内部方法动作”；②填写唯一 ID 和名称；③从下拉框选择快速存档、快速读档或切换全屏；④在应用目录中绑定该 ID。只能选择插件预注册的安全方法。",
      ),
    inPhoneAppActions: s
      .array("动作 · 手机内部应用", (item) => ({
        id: item.string("ID").default("new-in-phone-app"),
        name: item.string("名称").default("新手机内部应用"),
        phoneAppId: item
          .string("Phone SDK 应用 ID（扩展ID/程序ID）")
          .describe(
            "必须填写「扩展包 ID/程序 ID」，例如 ink.zenly.app-015abe/phone-chat 或 ink.zenly.app-cd6ad3/phone-album。禁止只填程序 ID（如 phone-chat），以免多扩展同 APPID 冲突绑错。扩展包 ID 见该扩展 extension.json 的 id；程序 ID 与 @extension({ id }) / registerPhoneApp({ id }) 一致。",
          ),
        description: item.string("说明"),
      }))
      .itemDefault({
        id: "new-in-phone-app",
        name: "新手机内部应用",
        phoneAppId: "",
        description: "",
      })
      .maxItems(40)
      .addLabel("添加手机内部应用动作")
      .emptyHint("没有手机内部应用动作。请先由外部通过 @ink-zenly/phone-sdk/plugin 注册应用。")
      .describe(
        "操作：①外部用 registerPhoneApp({ id: 程序ID }) 注册；②添加本动作，Phone SDK 应用 ID 必填「扩展ID/程序ID」（如 ink.zenly.app-015abe/phone-chat）；③在「手机应用目录」绑定该动作 ID。禁止只填程序 ID。",
      ),
    catalogApps: s
      .array("手机应用目录", (item) => ({
        id: item.string("应用 ID").default("new-app"),
        name: item.string("应用名称").default("新应用"),
        icon: item.asset("应用图标").accepts("image"),
        order: item
          .number("默认排序")
          .default(0)
          .range(0, 9999)
          .step(1)
          .describe("仅整数；数字越小越靠前，相同时按本目录的行顺序。"),
        preinstalled: item.boolean("游戏开始默认预装").default(true),
        enabled: item.boolean("作者默认可用").default(true),
        locked: item.boolean("锁定玩家编辑").default(false),
        defaultActionId: item.string("默认动作 ID").default("settings"),
      }))
      .itemDefault({
        id: "new-app",
        name: "新应用",
        order: 0,
        preinstalled: true,
        enabled: true,
        locked: false,
        defaultActionId: "settings",
      })
      .maxItems(40)
      .addLabel("添加应用")
      .emptyHint("未配置应用时使用插件内置应用目录。")
      .describe(
        "操作：①先在上方任一动作分组中添加动作并记下其 ID；②点击“添加应用”；③填写唯一应用 ID、名称并选择图标；④填写仅整数的“默认排序”，数字越小越靠前，相同时按本目录行顺序；⑤勾选“游戏开始默认预装”决定新游戏是否拥有该 APP；⑥“作者默认可用”决定其初始能否显示；⑦把动作 ID 原样填入“默认动作 ID”。剧情可再通过 APP 管理方法安装、删除、禁用或解禁。",
      ),
    backgroundColor: s.string("默认背景色").default("#172036"),
    backgroundImage: s.asset("默认背景图").accepts("image"),
    backgroundCss: s
      .string("默认 CSS 背景值")
      .default("")
      .describe("例如 linear-gradient(135deg, #182848, #4b6cb7)"),
    accentColor: s.string("默认强调色").default("#79c7ff"),
    shellColor: s.string("默认外壳颜色").default("#11151f"),
    markOutgoingUnreadReadBeforeIncoming: s
      .boolean("对方回复前将我方未读标为已读")
      .default(true)
      .describe(
        "开启后：当屏幕上已有我方「未读」消息，且下一条为对方消息时，点击屏幕（或 Enter / Space）会先把这些未读改为「已读」，需再操作一次才显示对方消息。下一条仍是我方、或没有未读时，行为与关闭相同。关闭则点击直接推进下一条。",
      ),

    allowPlayerCustomization: s
      .boolean("允许玩家个性化手机")
      .default(true)
      .describe(
        "关闭后隐藏玩家端个性化入口，并忽略玩家保存的名称、图标、背景、颜色、动作覆盖和应用绑定；数据不会删除，重新开启后恢复生效。",
      ),

    allowPlayerWallpaper: s
      .boolean("允许玩家更换背景")
      .default(true)
      .enabledWhen("allowPlayerCustomization", true),
    allowPlayerIcons: s
      .boolean("允许玩家更换图标")
      .default(true)
      .enabledWhen("allowPlayerCustomization", true),
  };
}

export const phoneHostSaveSchema = {
  preferences: {
    type: "list",
    persistence: "shared",
    default: [] as PlayerPhonePreferences[],
    label: "玩家手机个性化配置",
  },
  appAvailability: {
    type: "list",
    persistence: "shared",
    default: [] as PhoneAppAvailabilityOverride[],
    label: "剧情 APP 安装与可用状态",
  },
} as const;
