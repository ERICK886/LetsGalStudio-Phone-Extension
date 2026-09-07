/**
 * @file chat-inline-cards.ts
 * @description Studio 编辑器内联卡片：聊天内页方法块的摘要样式（非 SDK 正式接口）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.1
 *
 * @remarks
 * 参考相册扩展 `ext-cd6ad3/src/studio/album-inline-cards.ts`：通过受限 DOM/Fiber 探测，
 * 把本内页扩展的方法块显示为摘要卡片；不写入编辑器数据，Inspector 仍是参数编辑入口。
 * 强调色使用紫色，与相册深蓝卡片区分。
 *
 * @example
 * ```ts
 * // 在聊天扩展入口副作用加载即可：
 * import "./studio/chat-inline-cards";
 * ```
 */

import { EXTENSION_ID, PROGRAM_ID } from "../constants";
import { resolveMessageSlot } from "../domain/message-content";

/** 卡片根节点属性（与相册 / 宿主 phone 卡片隔离）。 */
const CARD_ATTRIBUTE = "data-chat-inline-card";

/** 已替换原生块的宿主容器属性。 */
const HOST_ATTRIBUTE = "data-chat-inline-card-host";

/** 记录原生子节点原始 display，便于恢复。 */
const ORIGINAL_DISPLAY_ATTRIBUTE = "data-chat-inline-original-display";

/** 注入 CSS 的 style 标签标记。 */
const STYLE_ATTRIBUTE = "data-chat-inline-card-style";

/** `globalThis` 上保存运行时，便于热更新时 dispose 旧实例。 */
const RUNTIME_KEY = "__inkZenlyChatInlineCards";

/**
 * Studio `callExtensionFunction` 块的最小结构（仅读 props，不写回）。
 */
interface ExtensionBlock {
  id?: unknown;
  type?: unknown;
  props?: { target?: unknown; paramsJson?: unknown };
}

/**
 * React Fiber 探测用的最小字段集。
 */
interface ReactFiber {
  memoizedProps?: { block?: ExtensionBlock };
  pendingProps?: { block?: ExtensionBlock };
  alternate?: ReactFiber | null;
  return?: ReactFiber | null;
}

/**
 * 内联卡片运行时句柄。
 */
interface InlineCardRuntime {
  observer?: MutationObserver;
  themeObserver?: MutationObserver;
  inspectorRefresh?: (event: Event) => void;
  frame?: number;
  dispose(): void;
}

/**
 * 方法展示元数据：标题与图标。
 *
 * @remarks
 * `label` 需与方法 `title` 一致，便于 Fiber 失败时按文本兜底识别。
 */
export const CHAT_INLINE_CARD_METHOD_META = {
  "send-friend-messages": { label: "聊天 · 对方发送消息", icon: "◀" },
  "await-player-reply": { label: "聊天 · 玩家回复一句", icon: "▶" },
  "send-group-messages": { label: "聊天 · 群成员发送消息", icon: "◀" },
  "await-group-reply": { label: "聊天 · 玩家回复群聊", icon: "▶" },
  "join-group": { label: "聊天 · 角色加入群聊", icon: "↘" },
  "leave-group": { label: "聊天 · 角色退出群聊", icon: "↗" },
  "add-friend": { label: "聊天 · 添加好友", icon: "＋" },
  "remove-friend": { label: "聊天 · 移除好友", icon: "−" },
} as const satisfies Record<string, { label: string; icon: string }>;

/** 聊天内页方法 ID（与 `ChatController` 静态 method 的 `id` 一致）。 */
export type ChatInlineCardMethodId = keyof typeof CHAT_INLINE_CARD_METHOD_META;

type ChatMethodId = ChatInlineCardMethodId;
const METHOD_META = CHAT_INLINE_CARD_METHOD_META;

/**
 * 判断值是否为普通对象。
 *
 * @param value - 任意值
 * @returns 是否为非 null 对象且非数组
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 将字符串收敛为已知聊天方法 ID。
 *
 * @param value - 候选方法 id
 * @returns 合法 `ChatMethodId`，否则 `undefined`
 */
function asChatMethodId(value: string): ChatMethodId | undefined {
  return Object.prototype.hasOwnProperty.call(METHOD_META, value)
    ? (value as ChatMethodId)
    : undefined;
}

/**
 * 读取本扩展包 id。
 *
 * @returns `ink.zenly.ext-7a9373`
 */
function getPackageExtensionId(): string {
  return EXTENSION_ID;
}

/**
 * 从块 `target` 解析聊天方法 ID。
 *
 * @param block - Fiber 上的扩展块
 * @returns 聊天方法 ID；非本内页方法则 `undefined`
 *
 * @remarks
 * 兼容路径：
 * - `ink.zenly.ext-7a9373/method-id`
 * - `ink.zenly.ext-7a9373/phone-chat/method-id`
 */
function chatMethodId(block: ExtensionBlock | undefined): ChatMethodId | undefined {
  if (block?.type !== "callExtensionFunction") return undefined;
  const target = block.props?.target;
  const packageId = getPackageExtensionId();
  if (typeof target !== "string" || !target.includes(packageId)) return undefined;

  const segments = target.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  return asChatMethodId(last);
}

/**
 * 结合 Fiber 与块文本兜底识别方法。
 *
 * @param content - BlockNote 内容根
 * @param block - 可选 Fiber 块
 * @returns 聊天方法 ID
 *
 * @remarks
 * Fiber 私有字段可能随 Studio 版本变动；兜底只检查当前块文本，
 * 绝不能向上读到编辑器根节点，否则相邻块标题会导致误判。
 */
function chatMethodIdFromContent(
  content: HTMLElement,
  block: ExtensionBlock | undefined,
): ChatMethodId | undefined {
  const fromBlock = chatMethodId(block);
  if (fromBlock) return fromBlock;

  const blockRoot = content.closest<HTMLElement>("[data-id]") ?? content;
  const text = blockRoot.textContent ?? "";
  const packageId = getPackageExtensionId();
  if (
    !text.includes(packageId) &&
    !text.includes(PROGRAM_ID) &&
    !text.includes("聊天 ·")
  ) {
    return undefined;
  }
  return (
    (Object.entries(METHOD_META).find(([, meta]) => text.includes(meta.label))?.[0] ??
      undefined) as ChatMethodId | undefined
  );
}

/** 角色 id → 显示名。 */
type CharacterNameMap = Map<string, string>;

/** 角色目录缓存（避免每帧全树扫描）。 */
let characterCatalogCache: { map: CharacterNameMap; at: number } | null = null;

/** 角色目录缓存有效期（毫秒）。 */
const CHARACTER_CATALOG_TTL_MS = 1500;

/**
 * 解析 Studio `paramsJson` 为原始对象（保留 value 封装）。
 *
 * @param paramsJson - 块上的 JSON 字符串
 * @returns 原始参数表；解析失败返回空对象
 */
function parseRawParams(paramsJson: unknown): Record<string, unknown> {
  if (typeof paramsJson !== "string") return {};
  try {
    const raw: unknown = JSON.parse(paramsJson);
    return isRecord(raw) ? raw : {};
  } catch {
    return {};
  }
}

/**
 * 解包 Studio `paramsJson` 中的字面量参数。
 *
 * @param paramsJson - 块上的 JSON 字符串
 * @returns 字段名 → 原始 value 的映射
 */
function literalParams(paramsJson: unknown): Record<string, unknown> {
  const raw = parseRawParams(paramsJson);
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => {
      if (!isRecord(value) || !("value" in value)) return [key, value];
      return [key, value.value];
    }),
  );
}

/**
 * 截断展示用字符串。
 *
 * @param value - 任意值（非字符串视为空）
 * @param limit - 最大长度，默认 72
 * @returns 截断后的字符串
 */
function truncate(value: unknown, limit = 72): string {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit
    ? `${normalized.slice(0, limit - 1)}…`
    : normalized;
}

/**
 * 从对象中提取可能的显示名字段。
 *
 * @param value - 候选对象
 * @returns 非空显示名，否则空串
 */
function pickDisplayName(value: Record<string, unknown>): string {
  for (const key of ["name", "displayName", "label", "title"] as const) {
    const named = value[key];
    if (typeof named === "string" && named.trim()) return named.trim();
  }
  return "";
}

/**
 * 从角色参数中提取角色 ID。
 *
 * @param value - 解包后或原始封装的 friend 参数
 * @returns 角色 ID；无法识别则空串
 */
function extractCharacterId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!isRecord(value)) return "";
  for (const key of ["value", "id", "characterId"] as const) {
    const id = value[key];
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return "";
}

/**
 * 将角色资产列表灌入 id→名称 映射。
 *
 * @param characters - 候选数组
 * @param map - 输出表
 * @returns 是否写入了至少一条
 */
function ingestCharacters(characters: unknown, map: CharacterNameMap): boolean {
  if (!Array.isArray(characters) || characters.length === 0) return false;
  let count = 0;
  for (const item of characters) {
    if (!isRecord(item)) continue;
    const id =
      typeof item.id === "string"
        ? item.id.trim()
        : typeof item.characterId === "string"
          ? item.characterId.trim()
          : "";
    const name = pickDisplayName(item);
    if (!id || !name) continue;
    // 优先保留已有更短/已写入的名字；首次写入即可
    if (!map.has(id)) {
      map.set(id, name);
      count += 1;
    }
  }
  return count > 0;
}

/**
 * 判断对象是否像角色资产（带名字 + 立绘相关字段）。
 *
 * @param value - 候选对象
 * @returns 是否像角色
 */
function looksLikeCharacter(value: Record<string, unknown>): boolean {
  if (!pickDisplayName(value)) return false;
  const id = extractCharacterId(value);
  if (!id) return false;
  return (
    typeof value.avatarUri === "string" ||
    Array.isArray(value.portraits) ||
    value.type === "character" ||
    // UUID 形态的角色资产 id
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
}

/**
 * 在任意对象图中寻找角色目录。
 *
 * @param value - 待扫描值
 * @param map - 输出表
 * @param depth - 当前深度
 * @param seen - 防环
 */
function scanValueForCharacters(
  value: unknown,
  map: CharacterNameMap,
  depth: number,
  seen: Set<unknown>,
): void {
  if (value == null || depth > 6) return;
  if (typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    if (value.length > 0 && isRecord(value[0]) && looksLikeCharacter(value[0])) {
      ingestCharacters(value, map);
    }
    const limit = Math.min(value.length, 12);
    for (let i = 0; i < limit; i += 1) {
      scanValueForCharacters(value[i], map, depth + 1, seen);
    }
    return;
  }

  if (!isRecord(value)) return;

  if (ingestCharacters(value.characters, map)) return;
  if (isRecord(value.project) && ingestCharacters(value.project.characters, map)) {
    return;
  }
  if (looksLikeCharacter(value)) {
    ingestCharacters([value], map);
  }

  for (const key of [
    "project",
    "state",
    "value",
    "data",
    "store",
    "getState",
    "characters",
    "characterAssets",
    "characterList",
    "_currentValue",
    "memoizedValue",
  ] as const) {
    if (!(key in value)) continue;
    const next = value[key];
    if (typeof next === "function" && key === "getState") {
      try {
        scanValueForCharacters((next as () => unknown)(), map, depth + 1, seen);
      } catch {
        // 忽略
      }
      continue;
    }
    scanValueForCharacters(next, map, depth + 1, seen);
    if (map.size > 0 && depth >= 2) return;
  }
}

/**
 * 扩展 ReactFiber 探测字段（hooks / context）。
 */
interface ReactFiberDeep extends ReactFiber {
  stateNode?: unknown;
  memoizedState?: unknown;
  type?: unknown;
  dependencies?: unknown;
}

/**
 * 扫描单根 Fiber：props / hooks state / context。
 *
 * @param fiber - Fiber 节点
 * @param map - 输出表
 */
function scanFiberNodeForCharacters(
  fiber: ReactFiberDeep,
  map: CharacterNameMap,
): void {
  const seen = new Set<unknown>();
  scanValueForCharacters(fiber.memoizedProps, map, 0, seen);
  scanValueForCharacters(fiber.pendingProps, map, 0, seen);
  scanValueForCharacters(fiber.stateNode, map, 0, seen);

  let hook: unknown = fiber.memoizedState;
  for (let i = 0; hook && i < 48; i += 1) {
    if (!isRecord(hook)) break;
    scanValueForCharacters(hook.memoizedState, map, 0, seen);
    scanValueForCharacters(hook.queue, map, 0, seen);
    hook = hook.next;
  }

  const type = fiber.type;
  if (isRecord(type) && isRecord(type._context)) {
    scanValueForCharacters(type._context._currentValue, map, 0, seen);
  }

  const deps = fiber.dependencies;
  if (isRecord(deps)) {
    let ctx: unknown = deps.firstContext;
    for (let i = 0; ctx && i < 24; i += 1) {
      if (!isRecord(ctx)) break;
      scanValueForCharacters(ctx.memoizedValue, map, 0, seen);
      ctx = ctx.next;
    }
  }
}

/**
 * 读取 DOM 节点上的 React Fiber。
 *
 * @param el - DOM 元素
 * @returns Fiber 或 undefined
 */
function fiberFromElement(el: Element | null | undefined): ReactFiberDeep | undefined {
  if (!el) return undefined;
  const fiberKey = Object.keys(el).find((key) => key.startsWith("__reactFiber$"));
  if (!fiberKey) return undefined;
  return (el as unknown as Record<string, ReactFiberDeep | undefined>)[fiberKey];
}

/**
 * 从编辑器 Fiber 树收集角色显示名目录。
 *
 * @param content - 当前块内容节点
 * @returns id → 显示名
 */
function collectCharacterNameMap(content: HTMLElement): CharacterNameMap {
  const now = Date.now();
  if (
    characterCatalogCache &&
    now - characterCatalogCache.at < CHARACTER_CATALOG_TTL_MS &&
    characterCatalogCache.map.size > 0
  ) {
    return characterCatalogCache.map;
  }

  const map: CharacterNameMap = new Map();
  const roots = new Set<Element>();
  for (
    let node: HTMLElement | null = content;
    node;
    node = node.parentElement
  ) {
    roots.add(node);
    if (node === document.body) break;
  }
  roots.add(document.documentElement);
  if (document.body) roots.add(document.body);

  for (const root of roots) {
    const fiber = fiberFromElement(root);
    if (!fiber) continue;
    let cursor: ReactFiberDeep | undefined = fiber;
    for (let i = 0; cursor && i < 80; i += 1) {
      scanFiberNodeForCharacters(cursor, map);
      cursor = (cursor.return as ReactFiberDeep | null | undefined) ?? undefined;
      if (map.size > 0 && i > 8) break;
    }
    if (map.size > 0) break;
  }

  characterCatalogCache = { map, at: now };
  return map;
}

/**
 * 将参数值转为可读短文案（布尔 / 状态等非角色字段）。
 *
 * @param value - 解包后的参数值
 * @param limit - 截断长度
 * @returns 展示字符串
 */
function displayValue(value: unknown, limit = 48): string {
  if (typeof value === "string") return truncate(value, limit);
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (isRecord(value)) {
    const named = pickDisplayName(value);
    if (named) return truncate(named, limit);
    const id = value.id ?? value.characterId ?? value.value;
    if (typeof id === "string") return truncate(id, limit);
  }
  return "";
}

/**
 * 将角色参数格式化为可读角色名。
 *
 * @param value - friend 参数（解包后的 id 或原始对象）
 * @param names - Fiber 扫到的角色目录
 * @param limit - 截断长度
 * @returns 角色显示名；未配置则空串
 *
 * @remarks
 * 优先级：对象自带 name → 角色目录 → 回退 id（避免空白）。
 */
function displayCharacter(
  value: unknown,
  names: CharacterNameMap,
  limit = 40,
): string {
  if (value == null) return "";

  if (isRecord(value)) {
    const named = pickDisplayName(value);
    if (named) return truncate(named, limit);
  }

  const id = extractCharacterId(value);
  if (!id) return "";

  const fromCatalog = names.get(id);
  if (fromCatalog) return truncate(fromCatalog, limit);

  return truncate(id, Math.min(limit, 32));
}

/**
 * 用原始参数对象补充角色目录（部分 Studio 版本会在封装上带 name）。
 *
 * @param rawFriend - paramsJson 中的 friend 字段（未解包）
 * @param names - 角色目录
 */
function seedCharacterFromRawParam(
  rawFriend: unknown,
  names: CharacterNameMap,
): void {
  if (!isRecord(rawFriend)) return;
  const id = extractCharacterId(rawFriend);
  const named = pickDisplayName(rawFriend);
  if (id && named && !names.has(id)) names.set(id, named);
}

/**
 * 将有效消息/回复槽转为内联卡片摘要片段。
 *
 * @param slot - `resolveMessageSlot` 结果
 * @param limit - 文字截断长度
 * @returns 摘要文本；无效槽为空串
 */
function slotInlineSummary(
  slot: ReturnType<typeof resolveMessageSlot>,
  limit = 48,
): string {
  if (!slot) return "";
  if (slot.contentType === "image") return "[图片]";
  return truncate(slot.text, limit);
}

/**
 * 统计对方消息槽中非空条数（含图片槽）。
 *
 * @param params - 解包后的参数
 * @returns 非空消息数量
 */
function countFriendMessages(params: Record<string, unknown>): number {
  let count = 0;
  for (let i = 1; i <= 8; i += 1) {
    const suffix = i === 1 ? "" : String(i);
    const slot = resolveMessageSlot({
      contentType: params[`contentType${suffix}`],
      text: params[`message${suffix}`],
      imageAsset: params[`imageAsset${suffix}`],
    });
    if (slot) count += 1;
  }
  return count;
}

/**
 * 取首条对方消息的内联摘要。
 *
 * @param params - 解包后的参数
 * @returns 首条有效槽摘要
 */
function firstFriendMessageSummary(params: Record<string, unknown>): string {
  return slotInlineSummary(
    resolveMessageSlot({
      contentType: params.contentType,
      text: params.message,
      imageAsset: params.imageAsset,
    }),
  );
}

/**
 * 统计玩家回复选项中非空条数（含图片槽）。
 *
 * @param params - 解包后的参数
 * @returns 非空回复数量
 */
function countReplyOptions(params: Record<string, unknown>): number {
  let count = 0;
  for (let i = 1; i <= 6; i += 1) {
    const slot = resolveMessageSlot({
      contentType: params[`reply${i}ContentType`],
      text: params[`reply${i}`],
      imageAsset: params[`reply${i}Image`],
    });
    if (slot) count += 1;
  }
  return count;
}

/**
 * 取首条回复选项的内联摘要。
 *
 * @param params - 解包后的参数
 * @returns 首条有效槽摘要
 */
function firstReplySummary(params: Record<string, unknown>): string {
  return slotInlineSummary(
    resolveMessageSlot({
      contentType: params.reply1ContentType,
      text: params.reply1,
      imageAsset: params.reply1Image,
    }),
  );
}

/**
 * 将布尔参数收敛为 true/false（兼容字符串封装）。
 *
 * @param value - 原始值
 * @param defaultValue - 缺省值
 * @returns 布尔结果
 */
function asBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return defaultValue;
}

/**
 * 从 DOM 节点向上/向内探测 React Fiber 上的扩展块。
 *
 * @param content - `callExtensionFunction` 内容节点
 * @returns 匹配的扩展块；找不到则 `undefined`
 */
function findBlock(content: HTMLElement): ExtensionBlock | undefined {
  const blockRoot = content.closest<HTMLElement>("[data-id]");
  const expectedBlockId = blockRoot?.dataset.id;
  const candidates: Element[] = [];
  for (let node: HTMLElement | null = content; node; node = node.parentElement) {
    candidates.push(node);
    if (node === blockRoot) break;
  }
  candidates.push(...content.querySelectorAll("*"));

  let chatBlockFallback: ExtensionBlock | undefined;
  for (const candidate of candidates) {
    const fiberKey = Object.keys(candidate).find((key) =>
      key.startsWith("__reactFiber$"),
    );
    let fiber = fiberKey
      ? (candidate as unknown as Record<string, ReactFiber | undefined>)[fiberKey]
      : undefined;
    while (fiber) {
      const blocks = [
        fiber.pendingProps?.block,
        fiber.memoizedProps?.block,
        fiber.alternate?.pendingProps?.block,
        fiber.alternate?.memoizedProps?.block,
      ];
      for (const block of blocks) {
        if (!block?.id) continue;
        if (expectedBlockId && String(block.id) === expectedBlockId) return block;
        if (!chatBlockFallback && chatMethodId(block)) chatBlockFallback = block;
      }
      fiber = fiber.return ?? undefined;
    }
  }
  return chatBlockFallback;
}

/**
 * 应用聊天卡片主题色（紫色强调色）。
 *
 * @param card - 卡片根元素
 * @param _content - 块内容节点（预留主题探测）
 *
 * @remarks
 * 紫色用于标题徽章背景、左边框与 chip 描边。
 */
function applyTheme(card: HTMLElement, _content: HTMLElement): void {
  card.style.setProperty("--chat-inline-accent", "#6d28d9");
  card.style.setProperty("--chat-inline-accent-text", "#ffffff");
}

/**
 * 注入聊天内联卡片 CSS（全局仅一次）。
 *
 * @returns void
 */
function addStyles(): void {
  if (document.querySelector(`style[${STYLE_ATTRIBUTE}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(STYLE_ATTRIBUTE, "");
  style.textContent = `
[${HOST_ATTRIBUTE}] { align-self: stretch; flex: 0 0 100% !important; min-width: 0; width: 100% !important; box-sizing: border-box; }
[${CARD_ATTRIBUTE}] { align-self: stretch; flex: 0 0 100%; min-width: 0; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 7px; min-height: 42px; padding: 8px 11px; border: 1px solid var(--border-subtle, #383440); border-left: 3px solid var(--chat-inline-accent); border-radius: 5px; background: var(--bg-canvas, #1b1920); color: var(--fg-primary, #f4f0ff); font: 13px/1.4 var(--font-sans, sans-serif); user-select: none; }
[${CARD_ATTRIBUTE}] .chat-inline-card__header { display: inline-flex; align-items: center; align-self: flex-start; min-width: 0; padding: 3px 6px; border-radius: 3px; background: var(--chat-inline-accent); color: var(--chat-inline-accent-text, #ffffff); }
[${CARD_ATTRIBUTE}] .chat-inline-card__badge { display: inline-flex; align-items: center; gap: 4px; min-width: 0; min-height: 22px; color: inherit; font-size: 13px; font-weight: 700; line-height: 1.25; }
[${CARD_ATTRIBUTE}] .chat-inline-card__icon { font-size: 14px; line-height: 1; }
[${CARD_ATTRIBUTE}] .chat-inline-card__title { overflow: hidden; color: inherit; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
[${CARD_ATTRIBUTE}] .chat-inline-card__summary { overflow: hidden; color: var(--fg-secondary, #c2bdcc); text-overflow: ellipsis; white-space: nowrap; }
[${CARD_ATTRIBUTE}] .chat-inline-card__chips { display: flex; flex-wrap: wrap; gap: 4px; }
[${CARD_ATTRIBUTE}] .chat-inline-card__chip { padding: 2px 5px; border: 1px solid var(--chat-inline-accent); border-radius: 3px; color: var(--fg-secondary, #c2bdcc); font-size: 11px; line-height: 1.35; }
`;
  document.head.append(style);
}

/**
 * 追加带 class 的文本节点。
 *
 * @param parent - 父元素
 * @param className - CSS class
 * @param value - 文本内容
 */
function appendText(parent: HTMLElement, className: string, value: string): void {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = value;
  parent.append(element);
}

/**
 * 追加 chip。
 *
 * @param parent - chip 行容器
 * @param value - chip 文案
 */
function appendChip(parent: HTMLElement, value: string): void {
  const chip = document.createElement("span");
  chip.className = "chat-inline-card__chip";
  chip.textContent = value;
  parent.append(chip);
}

/**
 * 按方法生成摘要与 chips。
 *
 * @param methodId - 聊天方法 ID
 * @param params - 解包后的字面量参数
 * @param characterLabel - 已解析的好友、群成员或入群角色显示名
 * @returns summary 与 chips
 */
export function buildChatInlineCardDetails(
  methodId: ChatMethodId,
  params: Record<string, unknown>,
  characterLabel: string,
): { summary: string; chips: string[] } {
  const friend = characterLabel;

  switch (methodId) {
    case "send-friend-messages": {
      const messageCount = countFriendMessages(params);
      const firstMessage = firstFriendMessageSummary(params);
      const openPhone = asBoolean(params.openPhone, true);
      const waitClose = asBoolean(params.waitUntilClose, false);
      return {
        summary: friend
          ? `对方发 ${messageCount} 条给 ${friend}${firstMessage ? `：${firstMessage}` : ""}`
          : "请在 Inspector 选择目标好友并填写消息。",
        chips: [
          friend ? `角色：${friend}` : "缺好友",
          messageCount > 0 ? `${messageCount} 条消息` : "无消息",
          openPhone ? "打开手机" : "不打开手机",
          waitClose ? "等待关手机" : undefined,
        ].filter((chip): chip is string => Boolean(chip)),
      };
    }
    case "await-player-reply": {
      const replyCount = countReplyOptions(params);
      const firstReply = firstReplySummary(params);
      const requireReply = asBoolean(params.requireReply, true);
      const closeAfter = asBoolean(params.closePhoneAfter, false);
      const status = displayValue(params.outgoingStatus, 16) || "read";
      return {
        summary: friend
          ? `${requireReply ? "等待" : "可选"}回复 ${friend}${firstReply ? `：${firstReply}` : ""}${replyCount > 1 ? ` 等 ${replyCount} 项` : ""}`
          : "请在 Inspector 选择好友并填写回复选项。",
        chips: [
          friend ? `角色：${friend}` : "缺好友",
          replyCount > 0 ? `${replyCount} 个选项` : "无选项",
          requireReply ? "必须回复" : "非必须",
          `状态：${status}`,
          closeAfter ? "回复后关手机" : undefined,
        ].filter((chip): chip is string => Boolean(chip)),
      };
    }
    case "send-group-messages": {
      const groupId = displayValue(params.groupId, 32);
      const messageCount = countFriendMessages(params);
      const firstMessage = firstFriendMessageSummary(params);
      const openPhone = asBoolean(params.openPhone, true);
      const waitClose = asBoolean(params.waitUntilClose, false);
      return {
        summary:
          friend && groupId
            ? `${friend} 在群聊 ${groupId} 发送 ${messageCount} 条消息${firstMessage ? `：${firstMessage}` : ""}`
            : "请在 Inspector 填写群 ID、选择发送者并填写消息。",
        chips: [
          groupId ? `群：${groupId}` : "缺群 ID",
          friend ? `发送者：${friend}` : "缺发送者",
          messageCount > 0 ? `${messageCount} 条消息` : "无消息",
          openPhone ? "打开手机" : "不打开手机",
          waitClose ? "等待关手机" : undefined,
        ].filter((chip): chip is string => Boolean(chip)),
      };
    }
    case "await-group-reply": {
      const groupId = displayValue(params.groupId, 32);
      const replyCount = countReplyOptions(params);
      const firstReply = firstReplySummary(params);
      const requireReply = asBoolean(params.requireReply, true);
      const closeAfter = asBoolean(params.closePhoneAfter, false);
      const status = displayValue(params.outgoingStatus, 16) || "read";
      return {
        summary: groupId
          ? `${requireReply ? "等待" : "可选"}回复群聊 ${groupId}${firstReply ? `：${firstReply}` : ""}${replyCount > 1 ? ` 等 ${replyCount} 项` : ""}`
          : "请在 Inspector 填写群 ID 并配置回复选项。",
        chips: [
          groupId ? `群：${groupId}` : "缺群 ID",
          replyCount > 0 ? `${replyCount} 个选项` : "无选项",
          requireReply ? "必须回复" : "非必须",
          `状态：${status}`,
          closeAfter ? "回复后关手机" : undefined,
        ].filter((chip): chip is string => Boolean(chip)),
      };
    }
    case "join-group": {
      const groupId = displayValue(params.groupId, 32);
      return {
        summary:
          friend && groupId
            ? `${friend} 加入群聊 ${groupId}`
            : "请在 Inspector 填写群 ID 并选择加入的角色。",
        chips: [
          "加入群聊",
          groupId ? `群：${groupId}` : "缺群 ID",
          friend ? `角色：${friend}` : "缺角色",
        ],
      };
    }
    case "leave-group": {
      const groupId = displayValue(params.groupId, 32);
      return {
        summary:
          friend && groupId
            ? `${friend} 退出群聊 ${groupId}（保留聊天记录）`
            : "请在 Inspector 填写群 ID 并选择退出的角色。",
        chips: [
          "退出群聊",
          groupId ? `群：${groupId}` : "缺群 ID",
          friend ? `角色：${friend}` : "缺角色",
        ],
      };
    }
    case "add-friend": {
      return {
        summary: friend
          ? `添加好友：${friend}`
          : "请在 Inspector 选择要添加的好友角色。",
        chips: ["添加", friend ? `角色：${friend}` : "缺角色"],
      };
    }
    case "remove-friend": {
      return {
        summary: friend
          ? `移除好友：${friend}（保留聊天记录）`
          : "请在 Inspector 选择要移除的好友角色。",
        chips: ["移除/隐藏", friend ? `角色：${friend}` : "缺角色"],
      };
    }
  }
}

/**
 * 渲染或更新单个方法块的摘要卡片。
 *
 * @param content - BlockNote 内容节点
 * @param block - Fiber 块（可缺）
 * @param methodId - 聊天方法 ID
 * @returns void
 */
function renderCard(
  content: HTMLElement,
  block: ExtensionBlock | undefined,
  methodId: ChatMethodId,
): void {
  addStyles();
  content.setAttribute(HOST_ATTRIBUTE, "");
  const original = [...content.children].find(
    (child) => !(child instanceof HTMLElement && child.hasAttribute(CARD_ATTRIBUTE)),
  );
  if (original instanceof HTMLElement && !original.hasAttribute(ORIGINAL_DISPLAY_ATTRIBUTE)) {
    original.setAttribute(
      ORIGINAL_DISPLAY_ATTRIBUTE,
      original.style.getPropertyValue("display"),
    );
    original.style.setProperty("display", "none", "important");
  }

  let card = content.querySelector<HTMLElement>(`:scope > [${CARD_ATTRIBUTE}]`);
  if (!card) {
    card = document.createElement("div");
    card.setAttribute(CARD_ATTRIBUTE, methodId);
    card.title = "点击此方法块后在 Inspector 编辑参数";
    content.append(card);
  }
  applyTheme(card, content);

  const rawParams = parseRawParams(block?.props?.paramsJson);
  const params = literalParams(block?.props?.paramsJson);
  const names = collectCharacterNameMap(content);
  const characterParam =
    methodId === "join-group" || methodId === "leave-group"
      ? "member"
      : methodId === "send-group-messages"
        ? "sender"
        : methodId === "await-group-reply"
          ? undefined
          : "friend";
  if (characterParam) seedCharacterFromRawParam(rawParams[characterParam], names);
  const characterLabel = characterParam
    ? displayCharacter(
        params[characterParam] ?? rawParams[characterParam],
        names,
      )
    : "";
  const { summary, chips } = buildChatInlineCardDetails(
    methodId,
    params,
    characterLabel,
  );
  const signature = `${methodId}\0${summary}\0${chips.join("\0")}`;
  if (card.dataset.signature === signature) return;
  card.dataset.signature = signature;
  card.replaceChildren();

  const header = document.createElement("div");
  header.className = "chat-inline-card__header";
  const badge = document.createElement("span");
  badge.className = "chat-inline-card__badge";
  appendText(badge, "chat-inline-card__icon", METHOD_META[methodId].icon);
  appendText(badge, "chat-inline-card__title", METHOD_META[methodId].label);
  header.append(badge);
  card.append(header);
  appendText(card, "chat-inline-card__summary", summary);
  if (chips.length) {
    const chipRow = document.createElement("div");
    chipRow.className = "chat-inline-card__chips";
    chips.forEach((chip) => appendChip(chipRow, chip));
    card.append(chipRow);
  }
}

/**
 * 恢复原生 Studio 方法块外观。
 *
 * @param content - 内容节点
 * @returns void
 */
function restoreNativeBlock(content: HTMLElement): void {
  const card = content.querySelector(`:scope > [${CARD_ATTRIBUTE}]`);
  if (!card) return;
  card.remove();
  content.removeAttribute(HOST_ATTRIBUTE);
  const original = content.querySelector<HTMLElement>(
    `:scope > [${ORIGINAL_DISPLAY_ATTRIBUTE}]`,
  );
  if (!original) return;
  const display = original.getAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
  if (display) original.style.setProperty("display", display);
  else original.style.removeProperty("display");
  original.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
}

/**
 * 扫描并刷新根节点下的聊天方法卡片。
 *
 * @param root - 扫描根（通常为 `document`）
 * @returns void
 */
function refresh(root: ParentNode): void {
  const selector = '.bn-block-content[data-content-type="callExtensionFunction"]';
  for (const content of root.querySelectorAll<HTMLElement>(selector)) {
    const block = findBlock(content);
    const methodId = chatMethodIdFromContent(content, block);
    if (methodId) renderCard(content, block, methodId);
    else if (content.querySelector(`:scope > [${CARD_ATTRIBUTE}]`)) {
      restoreNativeBlock(content);
    }
  }
}

/**
 * 安装 MutationObserver / Inspector 监听，开始维护聊天内联卡片。
 *
 * @returns void
 *
 * @remarks
 * 不依赖扩展加载时 Studio 的具体根节点；直接扫描当前 document。
 * 宿主探测失败时静默保留原生块。
 */
function installInlineCards(): void {
  if (typeof document === "undefined") return;
  const globals = globalThis as typeof globalThis & {
    [RUNTIME_KEY]?: InlineCardRuntime;
  };
  globals[RUNTIME_KEY]?.dispose();

  const blockSelector = '.bn-block-content[data-content-type="callExtensionFunction"]';

  const start = () => {
    const root = document;
    const runtime: InlineCardRuntime = {
      dispose() {
        if (runtime.frame !== undefined) cancelAnimationFrame(runtime.frame);
        runtime.observer?.disconnect();
        runtime.themeObserver?.disconnect();
        if (runtime.inspectorRefresh) {
          document.removeEventListener("input", runtime.inspectorRefresh, true);
          document.removeEventListener("change", runtime.inspectorRefresh, true);
        }
        document.querySelectorAll<HTMLElement>(blockSelector).forEach(restoreNativeBlock);
      },
    };
    const schedule = () => {
      if (runtime.frame !== undefined) return;
      runtime.frame = requestAnimationFrame(() => {
        runtime.frame = undefined;
        refresh(root);
      });
    };
    runtime.inspectorRefresh = () => schedule();
    document.addEventListener("input", runtime.inspectorRefresh, true);
    document.addEventListener("change", runtime.inspectorRefresh, true);
    runtime.observer = new MutationObserver(schedule);
    runtime.observer.observe(root, { childList: true, subtree: true });
    runtime.themeObserver = new MutationObserver(schedule);
    runtime.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    if (document.body) {
      runtime.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }
    window.addEventListener("pagehide", () => runtime.dispose(), { once: true });
    globals[RUNTIME_KEY] = runtime;
    schedule();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

installInlineCards();
