/**
 * @file album-inline-cards.ts
 * @description Studio 编辑器内联卡片：相册内页方法块的摘要样式（非 SDK 正式接口）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.1
 *
 * @remarks
 * 参考宿主 `phone-sdk/.../phone-inline-cards.ts`：通过受限 DOM/Fiber 探测，
 * 把本内页扩展的方法块显示为摘要卡片；不写入编辑器数据，Inspector 仍是参数编辑入口。
 * 样式与探测逻辑放在相册内页目录，避免污染宿主 phone-sdk。
 * 自 v0.1.1 起随相册模块迁入宿主包 `ink.zenly.ext-7a9373`，包 id 探测改用 `constants.EXTENSION_ID`。
 *
 * @example
 * ```ts
 * // 在相册扩展入口副作用加载即可：
 * import "./studio/album-inline-cards";
 * ```
 */

import { EXTENSION_ID, PROGRAM_ID } from "../constants";

/** 卡片根节点属性（与宿主 phone 卡片隔离，避免互相覆盖）。 */
const CARD_ATTRIBUTE = "data-album-inline-card";
/** 已替换原生块的宿主容器属性。 */
const HOST_ATTRIBUTE = "data-album-inline-card-host";
/** 记录原生子节点原始 display，便于恢复。 */
const ORIGINAL_DISPLAY_ATTRIBUTE = "data-album-inline-original-display";
/** 注入 CSS 的 style 标签标记。 */
const STYLE_ATTRIBUTE = "data-album-inline-card-style";
/** `globalThis` 上保存运行时，便于热更新时 dispose 旧实例。 */
const RUNTIME_KEY = "__inkZenlyAlbumInlineCards";

/**
 * 相册内页方法 ID（与 `PhoneAlbumExtension` 静态 method 的 `id` 一致）。
 */
type AlbumMethodId =
  | "add-album"
  | "remove-album"
  | "add-media"
  | "remove-media"
  | "set-media-albums";

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
const METHOD_META: Record<AlbumMethodId, { label: string; icon: string }> = {
  "add-album": { label: "相册 · 新增相册", icon: "＋" },
  "remove-album": { label: "相册 · 删除相册", icon: "−" },
  "add-media": { label: "相册 · 新增媒体", icon: "▣" },
  "remove-media": { label: "相册 · 删除媒体", icon: "✕" },
  "set-media-albums": { label: "相册 · 设置媒体归属", icon: "⇄" },
};

/**
 * 本扩展包 id（与 `extension.json` 的 `id` 一致）。
 *
 * @remarks
 * Studio 方法块 `target` 通常以该 id 开头，例如
 * `ink.zenly.ext-7a9373/phone-album/add-media`。
 */

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
 * 将字符串收敛为已知相册方法 ID。
 *
 * @param value - 候选方法 id
 * @returns 合法 `AlbumMethodId`，否则 `undefined`
 */
function asAlbumMethodId(value: string): AlbumMethodId | undefined {
  return Object.prototype.hasOwnProperty.call(METHOD_META, value)
    ? (value as AlbumMethodId)
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
 * 从块 `target` 解析相册方法 ID。
 *
 * @param block - Fiber 上的扩展块
 * @returns 相册方法 ID；非本内页方法则 `undefined`
 *
 * @remarks
 * 兼容路径：
 * - `ink.zenly.ext-7a9373/method-id`
 * - `ink.zenly.ext-7a9373/phone-album/method-id`
 */
function albumMethodId(block: ExtensionBlock | undefined): AlbumMethodId | undefined {
  if (block?.type !== "callExtensionFunction") return undefined;
  const target = block.props?.target;
  const packageId = getPackageExtensionId();
  if (typeof target !== "string" || !target.includes(packageId)) return undefined;

  const segments = target.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  return asAlbumMethodId(last);
}

/**
 * 结合 Fiber 与块文本兜底识别方法。
 *
 * @param content - BlockNote 内容根
 * @param block - 可选 Fiber 块
 * @returns 相册方法 ID
 *
 * @remarks
 * Fiber 私有字段可能随 Studio 版本变动；兜底只检查当前块文本，
 * 绝不能向上读到编辑器根节点，否则相邻块标题会导致误判。
 */
function albumMethodIdFromContent(
  content: HTMLElement,
  block: ExtensionBlock | undefined,
): AlbumMethodId | undefined {
  const fromBlock = albumMethodId(block);
  if (fromBlock) return fromBlock;

  const blockRoot = content.closest<HTMLElement>("[data-id]") ?? content;
  const text = blockRoot.textContent ?? "";
  const packageId = getPackageExtensionId();
  if (
    !text.includes(packageId) &&
    !text.includes(PROGRAM_ID) &&
    !text.includes("相册 ·")
  ) {
    return undefined;
  }
  return (
    (Object.entries(METHOD_META).find(([, meta]) => text.includes(meta.label))?.[0] ??
      undefined) as AlbumMethodId | undefined
  );
}

/**
 * 解包 Studio `paramsJson` 中的字面量参数。
 *
 * @param paramsJson - 块上的 JSON 字符串
 * @returns 字段名 → 原始 value 的映射
 */
function literalParams(paramsJson: unknown): Record<string, unknown> {
  if (typeof paramsJson !== "string") return {};
  try {
    const raw: unknown = JSON.parse(paramsJson);
    if (!isRecord(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).map(([key, value]) => {
        if (!isRecord(value) || !("value" in value)) return [key, value];
        return [key, value.value];
      }),
    );
  } catch {
    return {};
  }
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

  let albumBlockFallback: ExtensionBlock | undefined;
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
        if (!albumBlockFallback && albumMethodId(block)) albumBlockFallback = block;
      }
      fiber = fiber.return ?? undefined;
    }
  }
  return albumBlockFallback;
}

/**
 * 应用相册卡片主题色（深蓝强调色）。
 *
 * @param card - 卡片根元素
 * @param _content - 块内容节点（预留主题探测）
 *
 * @remarks
 * 深蓝用于标题徽章背景、左边框与 chip 描边，对应作者要求的「深蓝色背景」。
 */
function applyTheme(card: HTMLElement, _content: HTMLElement): void {
  card.style.setProperty("--album-inline-accent", "#1a4b8c");
  card.style.setProperty("--album-inline-accent-text", "#ffffff");
}

/**
 * 注入相册内联卡片 CSS（全局仅一次）。
 *
 * @returns void
 */
function addStyles(): void {
  if (document.querySelector(`style[${STYLE_ATTRIBUTE}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(STYLE_ATTRIBUTE, "");
  style.textContent = `
[${HOST_ATTRIBUTE}] { align-self: stretch; flex: 0 0 100% !important; min-width: 0; width: 100% !important; box-sizing: border-box; }
[${CARD_ATTRIBUTE}] { align-self: stretch; flex: 0 0 100%; min-width: 0; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 7px; min-height: 42px; padding: 8px 11px; border: 1px solid var(--border-subtle, #383440); border-left: 3px solid var(--album-inline-accent); border-radius: 5px; background: var(--bg-canvas, #1b1920); color: var(--fg-primary, #f4f0ff); font: 13px/1.4 var(--font-sans, sans-serif); user-select: none; }
[${CARD_ATTRIBUTE}] .album-inline-card__header { display: inline-flex; align-items: center; align-self: flex-start; min-width: 0; padding: 3px 6px; border-radius: 3px; background: var(--album-inline-accent); color: var(--album-inline-accent-text, #ffffff); }
[${CARD_ATTRIBUTE}] .album-inline-card__badge { display: inline-flex; align-items: center; gap: 4px; min-width: 0; min-height: 22px; color: inherit; font-size: 13px; font-weight: 700; line-height: 1.25; }
[${CARD_ATTRIBUTE}] .album-inline-card__icon { font-size: 14px; line-height: 1; }
[${CARD_ATTRIBUTE}] .album-inline-card__title { overflow: hidden; color: inherit; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
[${CARD_ATTRIBUTE}] .album-inline-card__summary { overflow: hidden; color: var(--fg-secondary, #c2bdcc); text-overflow: ellipsis; white-space: nowrap; }
[${CARD_ATTRIBUTE}] .album-inline-card__chips { display: flex; flex-wrap: wrap; gap: 4px; }
[${CARD_ATTRIBUTE}] .album-inline-card__chip { padding: 2px 5px; border: 1px solid var(--album-inline-accent); border-radius: 3px; color: var(--fg-secondary, #c2bdcc); font-size: 11px; line-height: 1.35; }
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
  chip.className = "album-inline-card__chip";
  chip.textContent = value;
  parent.append(chip);
}

/**
 * 按方法生成摘要与 chips。
 *
 * @param methodId - 相册方法 ID
 * @param params - 解包后的字面量参数
 * @returns summary 与 chips
 */
function renderDetails(
  methodId: AlbumMethodId,
  params: Record<string, unknown>,
): { summary: string; chips: string[] } {
  switch (methodId) {
    case "add-album": {
      const albumId = truncate(params.albumId, 48);
      const name = truncate(params.name, 48);
      return {
        summary: albumId
          ? `新增/覆盖相册：${name || albumId}${name && albumId && name !== albumId ? `（${albumId}）` : ""}`
          : "请在 Inspector 填写相册 ID。",
        chips: [
          albumId ? `ID：${albumId}` : "缺相册 ID",
          params.coverAsset || params.coverMediaId ? "有封面" : "无封面",
        ],
      };
    }
    case "remove-album": {
      const albumId = truncate(params.albumId, 48);
      return {
        summary: albumId
          ? `隐藏相册：${albumId}（不删除媒体）`
          : "请在 Inspector 填写相册 ID。",
        chips: ["隐藏", albumId ? `ID：${albumId}` : "缺相册 ID"],
      };
    }
    case "add-media": {
      const mediaId = truncate(params.mediaId, 48);
      const type = params.type === "video" ? "视频" : "图片";
      const albumIds = truncate(params.albumIds, 64);
      return {
        summary: mediaId
          ? `新增/覆盖${type}：${mediaId}${albumIds ? ` → ${albumIds}` : ""}`
          : "请在 Inspector 填写媒体 ID 与素材。",
        chips: [
          type,
          mediaId ? `ID：${mediaId}` : "缺媒体 ID",
          albumIds ? `归属：${albumIds}` : "未指定归属",
          params.posterAsset ? "有视频封面" : undefined,
        ].filter((chip): chip is string => Boolean(chip)),
      };
    }
    case "remove-media": {
      const mediaId = truncate(params.mediaId, 48);
      return {
        summary: mediaId
          ? `隐藏媒体：${mediaId}`
          : "请在 Inspector 填写媒体 ID。",
        chips: ["隐藏", mediaId ? `ID：${mediaId}` : "缺媒体 ID"],
      };
    }
    case "set-media-albums": {
      const mediaId = truncate(params.mediaId, 48);
      const albumIds = truncate(params.albumIds, 64);
      return {
        summary: mediaId
          ? `设置归属：${mediaId}${albumIds ? ` → ${albumIds}` : "（清空归属）"}`
          : "请在 Inspector 填写媒体 ID。",
        chips: [
          mediaId ? `媒体：${mediaId}` : "缺媒体 ID",
          albumIds ? `相册：${albumIds}` : "清空归属",
        ],
      };
    }
  }
}

/**
 * 渲染或更新单个方法块的摘要卡片。
 *
 * @param content - BlockNote 内容节点
 * @param block - Fiber 块（可缺）
 * @param methodId - 相册方法 ID
 * @returns void
 */
function renderCard(
  content: HTMLElement,
  block: ExtensionBlock | undefined,
  methodId: AlbumMethodId,
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

  const params = literalParams(block?.props?.paramsJson);
  const { summary, chips } = renderDetails(methodId, params);
  const signature = `${methodId}\0${summary}\0${chips.join("\0")}`;
  if (card.dataset.signature === signature) return;
  card.dataset.signature = signature;
  card.replaceChildren();

  const header = document.createElement("div");
  header.className = "album-inline-card__header";
  const badge = document.createElement("span");
  badge.className = "album-inline-card__badge";
  appendText(badge, "album-inline-card__icon", METHOD_META[methodId].icon);
  appendText(badge, "album-inline-card__title", METHOD_META[methodId].label);
  header.append(badge);
  card.append(header);
  appendText(card, "album-inline-card__summary", summary);
  if (chips.length) {
    const chipRow = document.createElement("div");
    chipRow.className = "album-inline-card__chips";
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
 * 扫描并刷新根节点下的相册方法卡片。
 *
 * @param root - 扫描根（通常为 `document`）
 * @returns void
 */
function refresh(root: ParentNode): void {
  const selector = '.bn-block-content[data-content-type="callExtensionFunction"]';
  for (const content of root.querySelectorAll<HTMLElement>(selector)) {
    const block = findBlock(content);
    const methodId = albumMethodIdFromContent(content, block);
    if (methodId) renderCard(content, block, methodId);
    else if (content.querySelector(`:scope > [${CARD_ATTRIBUTE}]`)) {
      restoreNativeBlock(content);
    }
  }
}

/**
 * 安装 MutationObserver / Inspector 监听，开始维护相册内联卡片。
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
