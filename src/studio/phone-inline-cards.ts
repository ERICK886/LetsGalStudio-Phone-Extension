/**
 * Studio 编辑器内联卡片（非 SDK 正式接口）。
 *
 * 通过受限的 DOM/Fiber 探测，把本扩展的方法块显示为摘要卡片；不写入编辑器数据，
 * Inspector 仍是参数编辑的唯一入口。宿主 DOM 变更或探测失败时会静默保留原生块。
 */
const CARD_ATTRIBUTE = "data-phone-inline-card";
const HOST_ATTRIBUTE = "data-phone-inline-card-host";
const ORIGINAL_DISPLAY_ATTRIBUTE = "data-phone-inline-original-display";
const STYLE_ATTRIBUTE = "data-phone-inline-card-style";
const BLOCK_SELECTOR = '.bn-block-content[data-content-type="callExtensionFunction"]';
const RUNTIME_KEY = "__inkZenlyPhoneInlineCards";

type PhoneMethodId =
  | "mount-phone"
  | "unmount-phone"
  | "manage-installed-apps"
  | "manage-app-enabled-state"
  | "show-message";

interface ExtensionBlock {
  id?: unknown;
  type?: unknown;
  props?: { target?: unknown; paramsJson?: unknown };
}

interface ReactFiber {
  memoizedProps?: { block?: ExtensionBlock };
  return?: ReactFiber | null;
}

interface InlineCardRuntime {
  observer?: MutationObserver;
  themeObserver?: MutationObserver;
  frame?: number;
  dispose(): void;
}

const METHOD_META: Record<PhoneMethodId, { label: string; icon: string }> = {
  "mount-phone": { label: "挂载手机", icon: "↗" },
  "unmount-phone": { label: "卸载手机", icon: "×" },
  "manage-installed-apps": { label: "管理已安装 APP", icon: "▣" },
  "manage-app-enabled-state": { label: "管理 APP 可用状态", icon: "◉" },
  "show-message": { label: "显示手机消息", icon: "✦" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPhoneMethodId(value: string): PhoneMethodId | undefined {
  return Object.prototype.hasOwnProperty.call(METHOD_META, value)
    ? value as PhoneMethodId
    : undefined;
}

function phoneMethodId(block: ExtensionBlock | undefined): PhoneMethodId | undefined {
  if (block?.type !== "callExtensionFunction") return undefined;
  const target = block.props?.target;
  if (typeof target !== "string" || !target.includes("ink.zenly.ext-7a9373")) return undefined;
  // 兼容 `extension-id/method-id` 与宿主可能加入的 `extension-id/ui-id/method-id` 路径。
  const segments = target.split("/");
  return asPhoneMethodId(segments[segments.length - 1] ?? "");
}

function phoneMethodIdFromContent(
  content: HTMLElement,
  block: ExtensionBlock | undefined,
): PhoneMethodId | undefined {
  const fromBlock = phoneMethodId(block);
  if (fromBlock) return fromBlock;

  // Fiber 私有字段可能随 Studio 版本变动；兜底只检查当前 BlockNote 块。
  // 绝不能向上读到编辑器根节点，否则相邻块的扩展 ID 和标题会导致误判。
  const blockRoot = content.closest<HTMLElement>("[data-id]") ?? content;
  const text = blockRoot.textContent ?? "";
  if (!text.includes("ink.zenly.ext-7a9373")) return undefined;
  return (Object.entries(METHOD_META).find(([, meta]) => text.includes(meta.label))?.[0]
    ?? undefined) as PhoneMethodId | undefined;
}

function literalParams(paramsJson: unknown): Record<string, unknown> {
  if (typeof paramsJson !== "string") return {};
  try {
    const raw: unknown = JSON.parse(paramsJson);
    if (!isRecord(raw)) return {};
    return Object.fromEntries(Object.entries(raw).map(([key, value]) => [
      key,
      isRecord(value) && value.kind === "lit" ? value.value : value,
    ]));
  } catch {
    return {};
  }
}

function truncate(value: unknown, limit = 72): string {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

function findBlock(content: HTMLElement): ExtensionBlock | undefined {
  const candidates: Element[] = [];
  for (let node: HTMLElement | null = content; node; node = node.parentElement) {
    candidates.push(node);
    if (node.matches("[data-id]")) break;
  }
  candidates.push(...content.querySelectorAll("*"));

  for (const candidate of candidates) {
    const fiberKey = Object.keys(candidate).find((key) => key.startsWith("__reactFiber$"));
    let fiber = fiberKey
      ? (candidate as unknown as Record<string, ReactFiber | undefined>)[fiberKey]
      : undefined;
    while (fiber) {
      if (fiber.memoizedProps?.block?.id) return fiber.memoizedProps.block;
      fiber = fiber.return ?? undefined;
    }
  }
  return undefined;
}

function applyTheme(card: HTMLElement, _content: HTMLElement): void {
  card.style.setProperty("--phone-inline-accent", "#d54483");
  card.style.setProperty("--phone-inline-accent-text", "#ffffff");
}

function addStyles(): void {
  if (document.querySelector(`style[${STYLE_ATTRIBUTE}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(STYLE_ATTRIBUTE, "");
  style.textContent = `
[${HOST_ATTRIBUTE}] { align-self: stretch; flex: 0 0 100% !important; min-width: 0; width: 100% !important; box-sizing: border-box; }
[${CARD_ATTRIBUTE}] { align-self: stretch; flex: 0 0 100%; min-width: 0; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 7px; min-height: 42px; padding: 8px 11px; border: 1px solid var(--border-subtle, #383440); border-left: 3px solid var(--phone-inline-accent); border-radius: 5px; background: var(--bg-canvas, #1b1920); color: var(--fg-primary, #f4f0ff); font: 13px/1.4 var(--font-sans, sans-serif); user-select: none; }
[${CARD_ATTRIBUTE}] .phone-inline-card__header { display: inline-flex; align-items: center; align-self: flex-start; min-width: 0; padding: 3px 6px; border-radius: 3px; background: var(--phone-inline-accent); color: var(--phone-inline-accent-text, #082f49); }
[${CARD_ATTRIBUTE}] .phone-inline-card__badge { display: inline-flex; align-items: center; gap: 4px; min-width: 0; min-height: 22px; color: inherit; font-size: 13px; font-weight: 700; line-height: 1.25; }
[${CARD_ATTRIBUTE}] .phone-inline-card__icon { font-size: 14px; line-height: 1; }
[${CARD_ATTRIBUTE}] .phone-inline-card__title { overflow: hidden; color: inherit; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
[${CARD_ATTRIBUTE}] .phone-inline-card__summary { overflow: hidden; color: var(--fg-secondary, #c2bdcc); text-overflow: ellipsis; white-space: nowrap; }
[${CARD_ATTRIBUTE}] .phone-inline-card__chips { display: flex; flex-wrap: wrap; gap: 4px; }
[${CARD_ATTRIBUTE}] .phone-inline-card__chip { padding: 2px 5px; border: 1px solid var(--phone-inline-accent); border-radius: 3px; color: var(--fg-secondary, #c2bdcc); font-size: 11px; line-height: 1.35; }
`;
  document.head.append(style);
}

function appendText(parent: HTMLElement, className: string, value: string): void {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = value;
  parent.append(element);
}

function appendChip(parent: HTMLElement, value: string): void {
  const chip = document.createElement("span");
  chip.className = "phone-inline-card__chip";
  chip.textContent = value;
  parent.append(chip);
}

function appIds(params: Record<string, unknown>): string[] {
  const ids: string[] = [];
  for (let index = 1; index <= 8; index += 1) {
    const suffix = index === 1 ? "" : String(index);
    const id = truncate(params[`appId${suffix}`], 64);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function renderDetails(
  methodId: PhoneMethodId,
  params: Record<string, unknown>,
): { summary: string; chips: string[] } {
  switch (methodId) {
    case "mount-phone":
      return { summary: "启用手机功能；玩家可使用配置的快捷键打开手机。", chips: ["不自动弹出"] };
    case "unmount-phone":
      return { summary: "关闭当前手机并结束消息等待；不会删除玩家个性化。", chips: ["保留 shared 存档"] };
    case "manage-installed-apps": {
      const installing = params.operation !== "remove";
      const ids = appIds(params);
      return {
        summary: `${installing ? "添加到手机" : "从手机删除"}${ids.length ? `：${ids.join("、")}` : "：请在 Inspector 填写 APP ID"}`,
        chips: [installing ? "安装" : "删除", `${ids.length} 个 APP`],
      };
    }
    case "manage-app-enabled-state": {
      const enabling = params.operation !== "disable";
      const ids = appIds(params);
      return {
        summary: `${enabling ? "解禁 APP" : "禁用 APP"}${ids.length ? `：${ids.join("、")}` : "：请在 Inspector 填写 APP ID"}`,
        chips: [enabling ? "解禁" : "禁用", `${ids.length} 个 APP`],
      };
    }
    case "show-message": {
      const messages: string[] = [];
      for (let index = 1; index <= 8; index += 1) {
        const suffix = index === 1 ? "" : String(index);
        const text = truncate(params[`message${suffix}`]);
        if (text) messages.push(text);
      }
      const direction = params.direction === "outgoing" ? "我方" : "对方";
      const preset = truncate(params.presetId, 48);
      const chips = [
        `${messages.length} 条消息`,
        direction,
        params.appendToExisting === true ? "接续上一组" : "新消息组",
        params.closeAfterMessages === false ? "结束后保留" : "结束后关闭",
      ];
      if (typeof params.storyBackground === "string" && params.storyBackground) chips.push("自定义背景");
      return {
        summary: messages.length
          ? `${direction}${preset ? ` · ${preset}` : ""}：${messages[0]}`
          : "请在 Inspector 填写首条消息内容和聊天角色预设 ID。",
        chips,
      };
    }
  }
}

function renderCard(
  content: HTMLElement,
  block: ExtensionBlock | undefined,
  methodId: PhoneMethodId,
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
  header.className = "phone-inline-card__header";
  const badge = document.createElement("span");
  badge.className = "phone-inline-card__badge";
  appendText(badge, "phone-inline-card__icon", METHOD_META[methodId].icon);
  appendText(badge, "phone-inline-card__title", METHOD_META[methodId].label);
  header.append(badge);
  card.append(header);
  appendText(card, "phone-inline-card__summary", summary);
  if (chips.length) {
    const chipRow = document.createElement("div");
    chipRow.className = "phone-inline-card__chips";
    chips.forEach((chip) => appendChip(chipRow, chip));
    card.append(chipRow);
  }
}

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

function refresh(root: ParentNode): void {
  for (const content of root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    const block = findBlock(content);
    const methodId = phoneMethodIdFromContent(content, block);
    if (methodId) renderCard(content, block, methodId);
    else if (content.querySelector(`:scope > [${CARD_ATTRIBUTE}]`)) restoreNativeBlock(content);
  }
}

function installInlineCards(): void {
  if (typeof document === "undefined") return;
  const globals = globalThis as typeof globalThis & { [RUNTIME_KEY]?: InlineCardRuntime };
  globals[RUNTIME_KEY]?.dispose();

  const start = () => {
    // 不依赖扩展加载时 Studio 的具体根节点；直接扫描当前 document，兼容延迟挂载和根节点重建。
    const root = document;
    const runtime: InlineCardRuntime = {
      dispose() {
        if (runtime.frame !== undefined) cancelAnimationFrame(runtime.frame);
        runtime.observer?.disconnect();
        runtime.themeObserver?.disconnect();
        document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach(restoreNativeBlock);
      },
    };
    const schedule = () => {
      if (runtime.frame !== undefined) return;
      runtime.frame = requestAnimationFrame(() => {
        runtime.frame = undefined;
        refresh(root);
      });
    };
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

installInlineCards();
