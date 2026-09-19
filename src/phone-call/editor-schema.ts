import type {
  PhoneEditorContentItemSchema,
  PhoneEditorPageSchema,
  PhoneEditorSectionSchema,
} from "@ink-zenly/phone-sdk";

export const PHONE_CALL_SETTINGS_MODULE_ID = "phone-call";

export const PHONE_CALL_CONTENT_ITEMS: readonly PhoneEditorContentItemSchema[] = [
  { id: "appTitle", group: "通用文案", label: "应用标题", icon: "heading", fieldType: "string", defaultValue: "电话" },
  { id: "keypadTabLabel", group: "底部导航", label: "拨号 Tab", icon: "grip", fieldType: "string", defaultValue: "拨号键盘" },
  { id: "recentTabLabel", group: "底部导航", label: "最近通话 Tab", icon: "clock-rotate-left", fieldType: "string", defaultValue: "最近通话" },
  { id: "contactsTabLabel", group: "底部导航", label: "通讯录 Tab", icon: "address-book", fieldType: "string", defaultValue: "通讯录" },
  { id: "dialingLabel", group: "拨号页", label: "拨号占位文案", icon: "phone", fieldType: "string", defaultValue: "拨号" },
  { id: "unknownNumberHint", group: "拨号页", label: "未知号码提示", icon: "triangle-exclamation", fieldType: "string", defaultValue: "号码不存在" },
  { id: "callFailedHint", group: "拨号页", label: "启动失败提示", icon: "circle-exclamation", fieldType: "string", defaultValue: "通话启动失败" },
  { id: "emptyRecentHint", group: "最近通话", label: "空记录提示", icon: "clock", fieldType: "string", defaultValue: "暂无通话记录" },
  { id: "emptyContactsHint", group: "通讯录", label: "空通讯录提示", icon: "user-slash", fieldType: "string", defaultValue: "暂无联系人" },
  { id: "incomingLabel", group: "来电页", label: "来电状态文案", icon: "phone-volume", fieldType: "string", defaultValue: "来电" },
  { id: "incomingHint", group: "来电页", label: "普通来电提示", icon: "comment", fieldType: "string", defaultValue: "正在呼叫…" },
  { id: "incomingRequiredHint", group: "来电页", label: "必须接听提示", icon: "circle-exclamation", fieldType: "string", defaultValue: "请接听电话" },
  { id: "incomingRingtone", group: "来电页", label: "来电铃声", icon: "music", fieldType: "asset", assetKind: "audio", defaultValue: "", allowEmpty: true, description: "可选音频素材；来电期间循环播放，接听、挂断或取消时停止。" },
  { id: "answerLabel", group: "来电页", label: "接听按钮文案", icon: "phone", fieldType: "string", defaultValue: "接听" },
  { id: "declineLabel", group: "来电页", label: "挂断按钮文案", icon: "phone-slash", fieldType: "string", defaultValue: "挂断" },
  { id: "styleBg", group: "基础颜色", label: "页面背景", icon: "fill-drip", fieldType: "color", defaultValue: "#f5f5f7" },
  { id: "styleSurface", group: "基础颜色", label: "卡片与顶栏", icon: "square", fieldType: "color", defaultValue: "#ffffff" },
  { id: "styleText", group: "基础颜色", label: "主文字", icon: "font", fieldType: "color", defaultValue: "#17171a" },
  { id: "styleMuted", group: "基础颜色", label: "次要文字", icon: "circle-half-stroke", fieldType: "color", defaultValue: "#85858b" },
  { id: "styleAccent", group: "基础颜色", label: "强调色", icon: "palette", fieldType: "color", defaultValue: "#1677ff" },
  { id: "styleIncomingBg", group: "来电颜色", label: "来电页背景", icon: "mobile-screen", fieldType: "color", defaultValue: "#17212c" },
  { id: "styleAnswer", group: "来电颜色", label: "接听按钮", icon: "phone", fieldType: "color", defaultValue: "#26be5c" },
  { id: "styleDecline", group: "来电颜色", label: "挂断按钮", icon: "phone-slash", fieldType: "color", defaultValue: "#e23f4e" },
];

const ids = (...values: string[]) => values;
export const PHONE_CALL_EDITOR_PAGES: readonly PhoneEditorPageSchema[] = [
  { id: "call-copy", label: "标题与导航", icon: "font", order: 10, status: "ready", contentItemIds: ids("appTitle", "keypadTabLabel", "recentTabLabel", "contactsTabLabel"), preview: "phone-call" },
  { id: "call-incoming", label: "来电界面", icon: "phone-volume", order: 20, status: "ready", contentItemIds: ids("incomingLabel", "incomingHint", "incomingRequiredHint", "incomingRingtone", "answerLabel", "declineLabel", "styleIncomingBg", "styleAnswer", "styleDecline"), preview: "phone-call" },
  { id: "call-keypad", label: "拨号界面", icon: "grip", order: 30, status: "ready", contentItemIds: ids("dialingLabel", "unknownNumberHint", "callFailedHint"), preview: "phone-call" },
  { id: "call-lists", label: "记录与通讯录", icon: "address-book", order: 40, status: "ready", contentItemIds: ids("emptyRecentHint", "emptyContactsHint"), preview: "phone-call" },
  { id: "call-contacts", label: "默认联系人", icon: "address-card", order: 50, status: "ready", contentItemIds: [], preview: "placeholder" },
  { id: "call-appearance", label: "基础外观", icon: "palette", order: 60, status: "ready", contentItemIds: ids("styleBg", "styleSurface", "styleText", "styleMuted", "styleAccent"), preview: "phone-call" },
];

export const PHONE_CALL_EDITOR_SCHEMA: PhoneEditorSectionSchema = {
  sectionId: PHONE_CALL_SETTINGS_MODULE_ID,
  settingsModuleId: PHONE_CALL_SETTINGS_MODULE_ID,
  contentItems: [...PHONE_CALL_CONTENT_ITEMS],
  pages: [...PHONE_CALL_EDITOR_PAGES],
};
