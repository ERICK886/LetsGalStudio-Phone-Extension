import type {
  AnyFieldBuilder,
  ExtensionContext,
  SettingsBuilder,
} from "@avg-studio/sdk";

export interface PhoneContactDefinition {
  characterId: string;
  phoneNumber: string;
}

export interface PhoneCallSettings {
  appTitle: string;
  defaultContacts: PhoneContactDefinition[];
  keypadTabLabel: string;
  recentTabLabel: string;
  contactsTabLabel: string;
  dialingLabel: string;
  unknownNumberHint: string;
  callFailedHint: string;
  emptyRecentHint: string;
  emptyContactsHint: string;
  incomingLabel: string;
  incomingHint: string;
  incomingRequiredHint: string;
  answerLabel: string;
  declineLabel: string;
  styleBg: string;
  styleSurface: string;
  styleText: string;
  styleMuted: string;
  styleAccent: string;
  styleIncomingBg: string;
  styleAnswer: string;
  styleDecline: string;
}

const DEFAULTS: PhoneCallSettings = {
  appTitle: "电话",
  defaultContacts: [],
  keypadTabLabel: "拨号键盘",
  recentTabLabel: "最近通话",
  contactsTabLabel: "通讯录",
  dialingLabel: "拨号",
  unknownNumberHint: "号码不存在",
  callFailedHint: "通话启动失败",
  emptyRecentHint: "暂无通话记录",
  emptyContactsHint: "暂无联系人",
  incomingLabel: "来电",
  incomingHint: "正在呼叫…",
  incomingRequiredHint: "请接听电话",
  answerLabel: "接听",
  declineLabel: "挂断",
  styleBg: "#f5f5f7",
  styleSurface: "#ffffff",
  styleText: "#17171a",
  styleMuted: "#85858b",
  styleAccent: "#1677ff",
  styleIncomingBg: "#17212c",
  styleAnswer: "#26be5c",
  styleDecline: "#e23f4e",
};

const cachedByRuntime = new WeakMap<object, PhoneCallSettings>();

function objectScope(value: unknown): object | undefined {
  return (typeof value === "object" && value !== null) ||
    typeof value === "function"
    ? value as object
    : undefined;
}

export const PHONE_CALL_SETTINGS_KEYS = Object.keys(
  DEFAULTS,
) as Array<keyof PhoneCallSettings>;

export function phoneCallRuntimeScope(ctx: ExtensionContext): object {
  try {
    const host = ctx.getHost() as {
      application?: unknown;
      varsStore?: unknown;
      characterStore?: unknown;
    } | null;
    // Studio 的 getHost() 每次调用都会返回新的包装对象，不能直接作为
    // WeakMap key。优先使用包装对象中跨调用稳定的宿主实例/Store。
    const stableHost = objectScope(host?.application) ??
      objectScope(host?.varsStore) ??
      objectScope(host?.characterStore);
    if (stableHost) return stableHost;
  } catch {
    // 测试或精简宿主可能不实现 getHost；ctx 本身仍是稳定作用域。
  }
  return ctx;
}

export function buildPhoneCallSettings(
  s: SettingsBuilder,
): Record<string, AnyFieldBuilder> {
  return {
    appTitle: s.string("应用标题").default("电话"),
    keypadTabLabel: s.string("拨号 Tab 名称").default("拨号键盘"),
    recentTabLabel: s.string("最近通话 Tab 名称").default("最近通话"),
    contactsTabLabel: s.string("通讯录 Tab 名称").default("通讯录"),
    dialingLabel: s.string("拨号占位文案").default("拨号"),
    unknownNumberHint: s.string("未知号码提示").default("号码不存在"),
    callFailedHint: s.string("通话启动失败提示").default("通话启动失败"),
    emptyRecentHint: s.string("空通话记录提示").default("暂无通话记录"),
    emptyContactsHint: s.string("空通讯录提示").default("暂无联系人"),
    incomingLabel: s.string("来电状态文案").default("来电"),
    incomingHint: s.string("普通来电提示").default("正在呼叫…"),
    incomingRequiredHint: s.string("必须接听提示").default("请接听电话"),
    answerLabel: s.string("接听按钮文案").default("接听"),
    declineLabel: s.string("挂断按钮文案").default("挂断"),
    styleBg: s.color("页面背景").default("#f5f5f7"),
    styleSurface: s.color("卡片与顶栏").default("#ffffff"),
    styleText: s.color("主文字").default("#17171a"),
    styleMuted: s.color("次要文字").default("#85858b"),
    styleAccent: s.color("强调色").default("#1677ff"),
    styleIncomingBg: s.color("来电页背景").default("#17212c"),
    styleAnswer: s.color("接听按钮颜色").default("#26be5c"),
    styleDecline: s.color("挂断按钮颜色").default("#e23f4e"),
    defaultContacts: s
      .array("默认联系人", (item) => ({
        characterId: item.character("角色"),
        phoneNumber: item.string("电话号码"),
      }))
      .itemDefault({ characterId: "", phoneNumber: "" })
      .maxItems(80)
      .addLabel("添加默认联系人")
      .emptyHint("也可以在剧情中使用“添加联系人”方法。"),
  };
}

export function readPhoneCallSettings(ctx: ExtensionContext): PhoneCallSettings {
  const rows = ctx.settings.get<unknown[]>("defaultContacts") ?? [];
  const contacts: PhoneContactDefinition[] = [];
  const seenCharacters = new Set<string>();
  const seenNumbers = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const value = row as { characterId?: unknown; phoneNumber?: unknown };
    const characterId = String(value.characterId ?? "").trim();
    const phoneNumber = String(value.phoneNumber ?? "").trim();
    if (!characterId || seenCharacters.has(characterId)) continue;
    if (phoneNumber && seenNumbers.has(phoneNumber)) continue;
    contacts.push({ characterId, phoneNumber });
    seenCharacters.add(characterId);
    if (phoneNumber) seenNumbers.add(phoneNumber);
  }

  const text = (key: Exclude<keyof PhoneCallSettings, "defaultContacts">) =>
    String(ctx.settings.get(key) ?? DEFAULTS[key]).trim() ||
    String(DEFAULTS[key]);

  return {
    defaultContacts: contacts,
    appTitle: text("appTitle"),
    keypadTabLabel: text("keypadTabLabel"),
    recentTabLabel: text("recentTabLabel"),
    contactsTabLabel: text("contactsTabLabel"),
    dialingLabel: text("dialingLabel"),
    unknownNumberHint: text("unknownNumberHint"),
    callFailedHint: text("callFailedHint"),
    emptyRecentHint: text("emptyRecentHint"),
    emptyContactsHint: text("emptyContactsHint"),
    incomingLabel: text("incomingLabel"),
    incomingHint: text("incomingHint"),
    incomingRequiredHint: text("incomingRequiredHint"),
    answerLabel: text("answerLabel"),
    declineLabel: text("declineLabel"),
    styleBg: text("styleBg"),
    styleSurface: text("styleSurface"),
    styleText: text("styleText"),
    styleMuted: text("styleMuted"),
    styleAccent: text("styleAccent"),
    styleIncomingBg: text("styleIncomingBg"),
    styleAnswer: text("styleAnswer"),
    styleDecline: text("styleDecline"),
  };
}

function cloneSettings(value: PhoneCallSettings): PhoneCallSettings {
  return {
    ...value,
    defaultContacts: value.defaultContacts.map((contact) => ({ ...contact })),
  };
}

export function cachePhoneCallSettings(
  ctx: ExtensionContext,
  value: PhoneCallSettings,
): void {
  cachedByRuntime.set(phoneCallRuntimeScope(ctx), cloneSettings(value));
}

export function getPhoneCallSettings(ctx: ExtensionContext): PhoneCallSettings {
  return cloneSettings(
    cachedByRuntime.get(phoneCallRuntimeScope(ctx)) ?? DEFAULTS,
  );
}
