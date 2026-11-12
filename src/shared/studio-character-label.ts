/** 既有 Studio 角色标签兼容适配；无初始化副作用，不依赖聊天业务。 */


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
 * 判断值是否为普通对象。
 *
 * @param value - 任意值
 * @returns 是否为非 null 对象且非数组
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}


/** 角色 id → 显示名。 */
type CharacterNameMap = Map<string, string>;


/** 角色目录缓存（避免每帧全树扫描）。 */
let characterCatalogCache: { map: CharacterNameMap; at: number } | null = null;


/** 角色目录缓存有效期（毫秒）。 */
const CHARACTER_CATALOG_TTL_MS = 1500;


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
 * 使用 Studio 当前 React/Fiber 角色目录把角色参数转换为显示名。
 * 电话、聊天等 line-card 共用此入口，避免各模块对 UUID 的解析结果不一致。
 */
function resolveStudioCharacterLabel(
  content: HTMLElement,
  rawParam: unknown,
  literalParam: unknown,
): string {
  const names = collectCharacterNameMap(content);
  seedCharacterFromRawParam(rawParam, names);
  return displayCharacter(literalParam ?? rawParam, names);
}
export { resolveStudioCharacterLabel, collectCharacterNameMap, seedCharacterFromRawParam, displayCharacter, pickDisplayName };
