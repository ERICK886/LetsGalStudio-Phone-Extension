/**
 * @file call-inline-cards.ts
 * @description Studio 编辑器内联卡片：电话 APP 方法块摘要（非 SDK 正式接口）。
 *
 * @remarks
 * 与手机、聊天、相册方法卡片采用同一受限 DOM/Fiber 渲染方式；只改变展示，
 * Inspector 仍是参数编辑的唯一入口。电话卡片使用独立青绿色，避免与宿主粉色、
 * 聊天紫色和相册深蓝混淆。
 */

import { EXTENSION_ID, PROGRAM_ID } from "../constants";
import { resolveStudioCharacterLabel } from "../../phone-chat/studio/chat-inline-cards";

const CARD_ATTRIBUTE = "data-call-inline-card";
const HOST_ATTRIBUTE = "data-call-inline-card-host";
const ORIGINAL_DISPLAY_ATTRIBUTE = "data-call-inline-original-display";
const STYLE_ATTRIBUTE = "data-call-inline-card-style";
const BLOCK_SELECTOR = '.bn-block-content[data-content-type="callExtensionFunction"]';
const RUNTIME_KEY = "__inkZenlyCallInlineCards";

export const CALL_INLINE_CARD_ACCENT = "#0f9f78";

export const CALL_INLINE_CARD_METHOD_META = {
  "incoming-call": { label: "电话 · 发起强制来电", icon: "☎" },
  "define-outgoing-call": { label: "电话 · 定义自主拨号剧情", icon: "↗" },
  "add-contact": { label: "电话 · 添加联系人", icon: "＋" },
  "remove-contact": { label: "电话 · 移除联系人", icon: "−" },
} as const satisfies Record<string, { label: string; icon: string }>;

export type CallInlineCardMethodId = keyof typeof CALL_INLINE_CARD_METHOD_META;

interface ExtensionBlock {
  id?: unknown;
  type?: unknown;
  props?: { target?: unknown; paramsJson?: unknown };
}

interface ReactFiber {
  memoizedProps?: { block?: ExtensionBlock };
  pendingProps?: { block?: ExtensionBlock };
  alternate?: ReactFiber | null;
  return?: ReactFiber | null;
}

interface InlineCardRuntime {
  observer?: MutationObserver;
  themeObserver?: MutationObserver;
  inspectorRefresh?: (event: Event) => void;
  frame?: number;
  dispose(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncate(value: unknown, limit = 48): string {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit
    ? `${normalized.slice(0, limit - 1)}…`
    : normalized;
}

function parseRawParams(paramsJson: unknown): Record<string, unknown> {
  if (typeof paramsJson !== "string") return {};
  try {
    const value: unknown = JSON.parse(paramsJson);
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function literalParams(paramsJson: unknown): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(parseRawParams(paramsJson)).map(([key, value]) => [
      key,
      isRecord(value) && "value" in value ? value.value : value,
    ]),
  );
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function displayFragment(value: unknown): string {
  if (typeof value === "string") return truncate(value, 32);
  if (!isRecord(value)) return "";
  return truncate(value.fragmentId ?? value.id ?? value.value, 32);
}

const POSITION_LABELS: Record<string, string> = {
  "top-left": "左上",
  "top-center": "上中",
  "top-right": "右上",
  "bottom-left": "左下",
  "bottom-center": "下中",
  "bottom-right": "右下",
  center: "居中",
};

/** 为单个电话方法生成可测试的摘要和参数标签。 */
export function buildCallInlineCardDetails(
  methodId: CallInlineCardMethodId,
  params: Record<string, unknown>,
  characterLabel: string,
): { summary: string; chips: string[] } {
  const character = truncate(characterLabel, 40);
  switch (methodId) {
    case "incoming-call": {
      const required = asBoolean(params.requireAnswer, false);
      const answerStory = displayFragment(params.answerStory);
      const declineStory = displayFragment(params.declineStory);
      const position =
        typeof params.position === "string"
          ? POSITION_LABELS[params.position] ?? params.position
          : "右下";
      return {
        summary: character
          ? `${character} 发起来电${required ? "，玩家必须接听" : ""}`
          : "请在 Inspector 选择来电角色。",
        chips: [
          character ? `角色：${character}` : "缺来电角色",
          required ? "必须接听" : "允许挂断",
          `方位：${position}`,
          answerStory ? "接听后有剧情" : "接听后无剧情",
          !required && declineStory ? "挂断后有剧情" : undefined,
        ].filter((chip): chip is string => Boolean(chip)),
      };
    }
    case "define-outgoing-call": {
      const story = displayFragment(params.story);
      return {
        summary: character
          ? `定义拨打 ${character} 时进入的剧情片段`
          : "请在 Inspector 选择联系人和拨号剧情片段。",
        chips: [
          character ? `联系人：${character}` : "缺联系人",
          story ? "已配置拨号剧情" : "缺拨号剧情",
        ],
      };
    }
    case "add-contact":
      return {
        summary: character
          ? `添加电话联系人：${character}`
          : "请在 Inspector 选择要添加的联系人。",
        chips: ["添加", character ? `联系人：${character}` : "缺联系人"],
      };
    case "remove-contact":
      return {
        summary: character
          ? `移除电话联系人：${character}（保留通话记录）`
          : "请在 Inspector 选择要移除的联系人。",
        chips: ["移除/隐藏", character ? `联系人：${character}` : "缺联系人"],
      };
  }
}

function callMethodId(block: ExtensionBlock | undefined): CallInlineCardMethodId | undefined {
  if (block?.type !== "callExtensionFunction") return undefined;
  const target = block.props?.target;
  if (typeof target !== "string" || !target.includes(EXTENSION_ID)) return undefined;
  const segments = target.split("/").filter(Boolean);
  const candidate = segments[segments.length - 1] ?? "";
  return Object.prototype.hasOwnProperty.call(CALL_INLINE_CARD_METHOD_META, candidate)
    ? candidate as CallInlineCardMethodId
    : undefined;
}

function callMethodIdFromContent(
  content: HTMLElement,
  block: ExtensionBlock | undefined,
): CallInlineCardMethodId | undefined {
  const fromBlock = callMethodId(block);
  if (fromBlock) return fromBlock;
  const text = (content.closest<HTMLElement>("[data-id]") ?? content).textContent ?? "";
  if (!text.includes(EXTENSION_ID) && !text.includes(PROGRAM_ID) && !text.includes("电话 ·")) {
    return undefined;
  }
  return Object.entries(CALL_INLINE_CARD_METHOD_META).find(([, meta]) =>
    text.includes(meta.label)
  )?.[0] as CallInlineCardMethodId | undefined;
}

function findBlock(content: HTMLElement): ExtensionBlock | undefined {
  const blockRoot = content.closest<HTMLElement>("[data-id]");
  const expectedBlockId = blockRoot?.dataset.id;
  const candidates: Element[] = [];
  for (let node: HTMLElement | null = content; node; node = node.parentElement) {
    candidates.push(node);
    if (node === blockRoot) break;
  }
  candidates.push(...content.querySelectorAll("*"));

  let fallback: ExtensionBlock | undefined;
  for (const candidate of candidates) {
    const key = Object.keys(candidate).find((item) => item.startsWith("__reactFiber$"));
    let fiber = key
      ? (candidate as unknown as Record<string, ReactFiber | undefined>)[key]
      : undefined;
    while (fiber) {
      for (const block of [
        fiber.pendingProps?.block,
        fiber.memoizedProps?.block,
        fiber.alternate?.pendingProps?.block,
        fiber.alternate?.memoizedProps?.block,
      ]) {
        if (!block?.id) continue;
        if (expectedBlockId && String(block.id) === expectedBlockId) return block;
        if (!fallback && callMethodId(block)) fallback = block;
      }
      fiber = fiber.return ?? undefined;
    }
  }
  return fallback;
}

function addStyles(): void {
  if (document.querySelector(`style[${STYLE_ATTRIBUTE}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(STYLE_ATTRIBUTE, "");
  style.textContent = `
[${HOST_ATTRIBUTE}] { align-self: stretch; flex: 0 0 100% !important; min-width: 0; width: 100% !important; box-sizing: border-box; }
[${CARD_ATTRIBUTE}] { --call-inline-accent: ${CALL_INLINE_CARD_ACCENT}; align-self: stretch; flex: 0 0 100%; min-width: 0; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 7px; min-height: 42px; padding: 8px 11px; border: 1px solid var(--border-subtle, #383440); border-left: 3px solid var(--call-inline-accent); border-radius: 5px; background: var(--bg-canvas, #1b1920); color: var(--fg-primary, #f4f0ff); font: 13px/1.4 var(--font-sans, sans-serif); user-select: none; }
[${CARD_ATTRIBUTE}] .call-inline-card__header { display: inline-flex; align-items: center; align-self: flex-start; min-width: 0; padding: 3px 6px; border-radius: 3px; background: var(--call-inline-accent); color: #fff; }
[${CARD_ATTRIBUTE}] .call-inline-card__badge { display: inline-flex; align-items: center; gap: 4px; min-width: 0; min-height: 22px; color: inherit; font-size: 13px; font-weight: 700; line-height: 1.25; }
[${CARD_ATTRIBUTE}] .call-inline-card__icon { font-size: 14px; line-height: 1; }
[${CARD_ATTRIBUTE}] .call-inline-card__title { overflow: hidden; color: inherit; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
[${CARD_ATTRIBUTE}] .call-inline-card__summary { overflow: hidden; color: var(--fg-secondary, #c2bdcc); text-overflow: ellipsis; white-space: nowrap; }
[${CARD_ATTRIBUTE}] .call-inline-card__chips { display: flex; flex-wrap: wrap; gap: 4px; }
[${CARD_ATTRIBUTE}] .call-inline-card__chip { padding: 2px 5px; border: 1px solid var(--call-inline-accent); border-radius: 3px; color: var(--fg-secondary, #c2bdcc); font-size: 11px; line-height: 1.35; }
`;
  document.head.append(style);
}

function appendText(parent: HTMLElement, className: string, value: string): void {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = value;
  parent.append(element);
}

function restoreNativeBlock(content: HTMLElement): void {
  content.querySelector(`:scope > [${CARD_ATTRIBUTE}]`)?.remove();
  content.removeAttribute(HOST_ATTRIBUTE);
  const original = content.querySelector<HTMLElement>(`:scope > [${ORIGINAL_DISPLAY_ATTRIBUTE}]`);
  if (!original) return;
  const display = original.getAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
  if (display) original.style.setProperty("display", display);
  else original.style.removeProperty("display");
  original.removeAttribute(ORIGINAL_DISPLAY_ATTRIBUTE);
}

function renderCard(
  content: HTMLElement,
  block: ExtensionBlock | undefined,
  methodId: CallInlineCardMethodId,
): void {
  addStyles();
  content.setAttribute(HOST_ATTRIBUTE, "");
  const original = [...content.children].find(
    (child) => !(child instanceof HTMLElement && child.hasAttribute(CARD_ATTRIBUTE)),
  );
  if (original instanceof HTMLElement && !original.hasAttribute(ORIGINAL_DISPLAY_ATTRIBUTE)) {
    original.setAttribute(ORIGINAL_DISPLAY_ATTRIBUTE, original.style.getPropertyValue("display"));
    original.style.setProperty("display", "none", "important");
  }

  let card = content.querySelector<HTMLElement>(`:scope > [${CARD_ATTRIBUTE}]`);
  if (!card) {
    card = document.createElement("div");
    card.setAttribute(CARD_ATTRIBUTE, methodId);
    card.title = "点击此方法块后在 Inspector 编辑参数";
    content.append(card);
  }

  const raw = parseRawParams(block?.props?.paramsJson);
  const params = literalParams(block?.props?.paramsJson);
  const characterKey = methodId === "incoming-call" ? "caller" : "contact";
  const label = resolveStudioCharacterLabel(
    content,
    raw[characterKey],
    params[characterKey],
  );
  const details = buildCallInlineCardDetails(methodId, params, label);
  const signature = `${methodId}\0${details.summary}\0${details.chips.join("\0")}`;
  if (card.dataset.signature === signature) return;
  card.dataset.signature = signature;
  card.replaceChildren();

  const header = document.createElement("div");
  header.className = "call-inline-card__header";
  const badge = document.createElement("span");
  badge.className = "call-inline-card__badge";
  appendText(badge, "call-inline-card__icon", CALL_INLINE_CARD_METHOD_META[methodId].icon);
  appendText(badge, "call-inline-card__title", CALL_INLINE_CARD_METHOD_META[methodId].label);
  header.append(badge);
  card.append(header);
  appendText(card, "call-inline-card__summary", details.summary);
  if (details.chips.length) {
    const row = document.createElement("div");
    row.className = "call-inline-card__chips";
    for (const value of details.chips) appendText(row, "call-inline-card__chip", value);
    card.append(row);
  }
}

function refresh(root: ParentNode): void {
  for (const content of root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    const block = findBlock(content);
    const methodId = callMethodIdFromContent(content, block);
    if (methodId) renderCard(content, block, methodId);
    else if (content.querySelector(`:scope > [${CARD_ATTRIBUTE}]`)) restoreNativeBlock(content);
  }
}

function installInlineCards(): void {
  if (typeof document === "undefined") return;
  const globals = globalThis as typeof globalThis & { [RUNTIME_KEY]?: InlineCardRuntime };
  globals[RUNTIME_KEY]?.dispose();

  const start = () => {
    const runtime: InlineCardRuntime = {
      dispose() {
        if (runtime.frame !== undefined) cancelAnimationFrame(runtime.frame);
        runtime.observer?.disconnect();
        runtime.themeObserver?.disconnect();
        if (runtime.inspectorRefresh) {
          document.removeEventListener("input", runtime.inspectorRefresh, true);
          document.removeEventListener("change", runtime.inspectorRefresh, true);
        }
        document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach(restoreNativeBlock);
      },
    };
    const schedule = () => {
      if (runtime.frame !== undefined) return;
      runtime.frame = requestAnimationFrame(() => {
        runtime.frame = undefined;
        refresh(document);
      });
    };
    runtime.inspectorRefresh = schedule;
    document.addEventListener("input", runtime.inspectorRefresh, true);
    document.addEventListener("change", runtime.inspectorRefresh, true);
    runtime.observer = new MutationObserver(schedule);
    runtime.observer.observe(document, { childList: true, subtree: true });
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
