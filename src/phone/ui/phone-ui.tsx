import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  INTERNAL_SYSTEM_SLOT,
  INTERNAL_SYSTEM_SLOT_IDS,
  INTERNAL_SYSTEM_SLOTS,
  useExtensionContext,
} from "@avg-studio/sdk";
import phoneCss from "../styles/phone.css?inline";
import { PhoneErrorBoundary } from "./components/phone-error-boundary";
import { PhoneStoryMessageItem } from "./components/story-message-item";
import { firstGlyph, readImage, resolveAssetUrl } from "./asset-utils";
import {
  catalogFromSettingsRows,
  emptyPreferences,
  getPhoneActionValidationError,
  launchPhoneTarget,
  mergePhoneCatalog,
  normalizePreferences,
  resolvePhoneApps,
  sanitizeBackgroundCss,
  type LocalCommandId,
  type PhoneActionDefinition,
  type PhoneTarget,
  type PlayerPhonePreferences,
  type ResolvedPhoneApp,
} from "../core/catalog";
import type {
  PhonePopupPosition,
  PhoneStoryMessage,
  PhoneUIProps,
} from "../extension/phone-extension";

const GRID_COLUMNS = 4;
const MAX_WALLPAPER_BYTES = 2 * 1024 * 1024;
const MAX_ICON_BYTES = 512 * 1024;
const PHONE_POPUP_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "center",
] as const;
const PHONE_CLOSE_ANIMATION_MS = 220;
const PROCESSED_STORY_POINTER_EVENTS = new WeakSet<Event>();

type LocalPhonePopupPosition = (typeof PHONE_POPUP_POSITIONS)[number];

function normalizePhonePopupPosition(value: unknown): LocalPhonePopupPosition {
  return (PHONE_POPUP_POSITIONS as readonly unknown[]).includes(value)
    ? value as LocalPhonePopupPosition
    : "bottom-right";
}

const TARGET_TYPE_LABELS: Record<PhoneTarget["kind"], string> = {
  "program-ui": "程序 UI（本扩展/跨扩展）",
  "visual-ui": "可视化 UI（项目/扩展）",
  "system-slot": "内置系统界面",
  "extension-method": "扩展方法（Fragment 适配）",
  fragment: "剧情 Fragment",
  "local-command": "手机内部方法",
};

const PHONE_SYSTEM_SLOT_IDS = INTERNAL_SYSTEM_SLOT_IDS.filter(
  (slot) => slot !== INTERNAL_SYSTEM_SLOT.Input && slot !== INTERNAL_SYSTEM_SLOT.Choice,
);

const LOCAL_COMMAND_LABELS: Record<LocalCommandId, string> = {
  "quick-save": "快速存档",
  "quick-load": "快速读档",
  "toggle-fullscreen": "切换全屏",
};

function createDefaultTarget(kind: PhoneTarget["kind"]): PhoneTarget {
  switch (kind) {
    case "program-ui": return { kind, ref: "" };
    case "visual-ui": return { kind, name: "", modal: true };
    case "system-slot": return { kind, slot: INTERNAL_SYSTEM_SLOT.Settings };
    case "extension-method": return { kind, methodRef: "", fragmentId: "" };
    case "fragment": return { kind, fragmentId: "" };
    case "local-command": return { kind, commandId: "quick-save" };
  }
}

function isTextInput(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

/**
 * 手机程序 UI 的状态编排根组件。
 *
 * 普通模式负责读取作者目录、加载/保存 shared 玩家偏好、编辑草稿、键盘网格导航和应用启动；
 * 剧情消息模式则订阅扩展的模块级消息会话，并隔离 pointer/mouse/keyboard 事件，确保一次输入最多推进一条消息。
 * 作者关闭玩家个性化时会忽略而非删除既有 shared 偏好；关闭动画复用同一个 Promise，保证目标动作只会在手机关闭后启动。
 */
const PhoneUIContent: React.FC<PhoneUIProps> = ({
  loadPreferences,
  savePreferences,
  isPhoneMounted,
  closePhone,
  storyMessages,
  storyPopupPosition,
  subscribeStoryMessages,
  advanceStoryMessage,
}) => {
  const ctx = useExtensionContext();
  const [displayStoryMessages, setDisplayStoryMessages] = useState<readonly PhoneStoryMessage[]>(
    () => storyMessages ?? [],
  );
  const [displayStoryPopupPosition, setDisplayStoryPopupPosition] = useState<PhonePopupPosition>(
    () => normalizePhonePopupPosition(storyPopupPosition),
  );
  const [awaitingStoryAdvance, setAwaitingStoryAdvance] = useState(
    () => storyMessages !== undefined,
  );
  // 首次 render 可能尚未接收到 ctx.ui.show 的 data；订阅回放到达后仍必须切换到消息模式。
  const messageMode = storyMessages !== undefined || awaitingStoryAdvance || displayStoryMessages.length > 0;
  const [storedPreferences, setStoredPreferences] = useState<readonly PlayerPhonePreferences[]>([]);
  const phoneTitle = ctx.settings.get<string>("phoneTitle");
  const popupPosition = normalizePhonePopupPosition(
    ctx.settings.get<string>("popupPosition"),
  );
  const programUiActionRows = ctx.settings.get<unknown[]>("programUiActions");
  const visualUiActionRows = ctx.settings.get<unknown[]>("visualUiActions");
  const systemSlotActionRows = ctx.settings.get<unknown[]>("systemSlotActions");
  const internalMethodActionRows = ctx.settings.get<unknown[]>("internalMethodActions");
  const catalogAppRows = ctx.settings.get<unknown[]>("catalogApps");
  // 旧宽表和旧 JSON 已从 Studio Schema 移除，但继续读取历史值以兼容已有项目。
  const legacyCatalogActionRows = ctx.settings.get<unknown[]>("catalogActions");
  const legacyCatalogJson = ctx.settings.get<string>("appCatalogJson");
  const defaultBackgroundColor = ctx.settings.get<string>("backgroundColor");
  const defaultBackgroundImage = ctx.settings.get<string>("backgroundImage");
  const defaultBackgroundCss = ctx.settings.get<string>("backgroundCss");
  const defaultAccentColor = ctx.settings.get<string>("accentColor");
  const defaultShellColor = ctx.settings.get<string>("shellColor");
  const allowPlayerCustomization = ctx.settings.get<boolean>("allowPlayerCustomization");
  const allowPlayerWallpaper = ctx.settings.get<boolean>("allowPlayerWallpaper");
  const allowPlayerIcons = ctx.settings.get<boolean>("allowPlayerIcons");
  const playerCustomizationEnabled = allowPlayerCustomization !== false;

  const baseCatalog = useMemo(
    () => catalogFromSettingsRows(
      legacyCatalogActionRows,
      catalogAppRows,
      legacyCatalogJson,
      {
        programUiActions: programUiActionRows,
        visualUiActions: visualUiActionRows,
        systemSlotActions: systemSlotActionRows,
        internalMethodActions: internalMethodActionRows,
      },
    ),
    [
      legacyCatalogActionRows,
      catalogAppRows,
      legacyCatalogJson,
      programUiActionRows,
      visualUiActionRows,
      systemSlotActionRows,
      internalMethodActionRows,
    ],
  );
  const preferences = useMemo(
    () => normalizePreferences(storedPreferences),
    [storedPreferences],
  );
  const [draft, setDraft] = useState<PlayerPhonePreferences>(() => preferences);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [selectedActionId, setSelectedActionId] = useState("");
  const [focusedAppId, setFocusedAppId] = useState("");
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const appRefs = useRef(new Map<string, HTMLButtonElement>());
  const storyListRef = useRef<HTMLElement | null>(null);
  const messageTimer = useRef<number | undefined>();
  const closeTimer = useRef<number | undefined>();
  const closePromise = useRef<Promise<void> | null>(null);

  const activePreferences = useMemo(
    () => playerCustomizationEnabled
      ? (editorOpen ? draft : preferences)
      : emptyPreferences(),
    [playerCustomizationEnabled, editorOpen, draft, preferences],
  );
  const catalog = useMemo(
    () => mergePhoneCatalog(baseCatalog, activePreferences),
    [baseCatalog, activePreferences],
  );
  const apps = useMemo(
    () => resolvePhoneApps(catalog, activePreferences),
    [catalog, activePreferences],
  );
  const selectedApp = apps.find((app) => app.id === selectedAppId) ?? apps[0];
  const selectedAction = catalog.actions.find((action) => action.id === selectedActionId)
    ?? catalog.actions[0];

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    let attempts = 0;

    const load = () => {
      try {
        const value = loadPreferences();
        if (!cancelled) setStoredPreferences(Array.isArray(value) ? value : []);
      } catch (error) {
        attempts += 1;
        if (!cancelled && attempts < 4) {
          retryTimer = window.setTimeout(load, 50);
        } else {
          console.error("[phone] 读取玩家手机设置失败，已使用默认设置", error);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [loadPreferences]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    // 订阅函数会立即回放模块级当前快照，因此即便 UI 首次以普通 props 挂载，也不会漏掉初始化阶段的首条消息。
    if (!subscribeStoryMessages) return undefined;
    return subscribeStoryMessages((messages, awaitingAdvance, popupPosition) => {
      setDisplayStoryMessages(messages);
      setAwaitingStoryAdvance(awaitingAdvance);
      setDisplayStoryPopupPosition(popupPosition);
    });
  }, [subscribeStoryMessages]);

  useEffect(() => {
    if (!messageMode) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const list = storyListRef.current;
      if (!list) return;
      list.scrollTo({
        top: list.scrollHeight,
        behavior: displayStoryMessages.length > 1 ? "smooth" : "auto",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messageMode, displayStoryMessages.length]);

  useEffect(() => () => {
    if (messageTimer.current !== undefined) window.clearTimeout(messageTimer.current);
    if (closeTimer.current !== undefined) window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (!playerCustomizationEnabled && editorOpen) setEditorOpen(false);
  }, [playerCustomizationEnabled, editorOpen]);

  useEffect(() => {
    if (!editorOpen) setDraft(preferences);
  }, [editorOpen, preferences]);

  useEffect(() => {
    if (apps.length === 0) {
      setFocusedAppId("");
      return;
    }
    if (!apps.some((app) => app.id === focusedAppId)) {
      setFocusedAppId(apps[0].id);
    }
    if (!apps.some((app) => app.id === selectedAppId)) {
      setSelectedAppId(apps[0].id);
    }
  }, [apps, focusedAppId, selectedAppId]);

  useEffect(() => {
    if (!catalog.actions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(catalog.actions[0]?.id ?? "");
    }
  }, [catalog.actions, selectedActionId]);

  useEffect(() => {
    if (!editorOpen && focusedAppId) {
      appRefs.current.get(focusedAppId)?.focus({ preventScroll: true });
    }
  }, [editorOpen, focusedAppId]);

  const showMessage = (text: string) => {
    setMessage(text);
    if (messageTimer.current !== undefined) window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(""), 2600);
  };

  const persistPreferences = (value: readonly PlayerPhonePreferences[]) => {
    setStoredPreferences(value);
    try {
      savePreferences(value);
    } catch (error) {
      console.error("[phone] 保存玩家手机设置失败", error);
      showMessage("设置仅在本次打开中生效，存档写入失败");
    }
  };

  const authorWallpaperUrl = useMemo(
    () => resolveAssetUrl(ctx, defaultBackgroundImage),
    [ctx, defaultBackgroundImage],
  );
  const backgroundCss = sanitizeBackgroundCss(activePreferences.backgroundCss)
    ?? sanitizeBackgroundCss(defaultBackgroundCss);
  const wallpaperUrl = activePreferences.wallpaperDataUrl ?? authorWallpaperUrl;
  const screenStyle: CSSProperties = backgroundCss
    ? { background: backgroundCss }
    : wallpaperUrl
      ? {
          backgroundColor: defaultBackgroundColor ?? "#172036",
          backgroundImage: `linear-gradient(rgba(4, 8, 16, .08), rgba(4, 8, 16, .24)), url(${JSON.stringify(wallpaperUrl)})`,
        }
      : { background: defaultBackgroundColor ?? "#172036" };
  const rootStyle = {
    "--phone-accent": activePreferences.accentColor ?? defaultAccentColor ?? "#79c7ff",
    "--phone-shell": activePreferences.shellColor ?? defaultShellColor ?? "#11151f",
    ...(messageMode
      ? { pointerEvents: awaitingStoryAdvance && !closing ? "auto" : "none" }
      : {}),
  } as CSSProperties;

  /**
   * 在固定四列桌面中计算下一个 roving-tabindex 焦点。
   * 末行不足四项时会选择同一列可用的最后一项；到达边界时保持原焦点，不会循环。
   */
  const moveFocus = (direction: "up" | "down" | "left" | "right") => {
    if (apps.length === 0) return;
    const currentIndex = Math.max(0, apps.findIndex((app) => app.id === focusedAppId));
    const row = Math.floor(currentIndex / GRID_COLUMNS);
    const column = currentIndex % GRID_COLUMNS;
    let nextIndex = currentIndex;

    if (direction === "left" && column > 0) nextIndex = currentIndex - 1;
    if (direction === "right" && column < GRID_COLUMNS - 1 && currentIndex + 1 < apps.length) {
      nextIndex = currentIndex + 1;
    }
    if (direction === "up" && row > 0) {
      const targetStart = (row - 1) * GRID_COLUMNS;
      const targetLength = Math.min(GRID_COLUMNS, apps.length - targetStart);
      nextIndex = targetStart + Math.min(column, targetLength - 1);
    }
    if (direction === "down") {
      const targetStart = (row + 1) * GRID_COLUMNS;
      if (targetStart < apps.length) {
        const targetLength = Math.min(GRID_COLUMNS, apps.length - targetStart);
        nextIndex = targetStart + Math.min(column, targetLength - 1);
      }
    }
    setFocusedAppId(apps[nextIndex].id);
  };

  /**
   * 播放一次关闭动画并在结束后调用宿主关闭回调。
   * 多次调用会返回同一个 Promise，防止动画期间重复隐藏 UI 或重复启动应用；系统启用“减少动态效果”时立即完成。
   */
  const closeWithAnimation = useCallback((): Promise<void> => {
    if (closePromise.current) return closePromise.current;

    setClosing(true);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    closePromise.current = new Promise<void>((resolve) => {
      closeTimer.current = window.setTimeout(() => {
        closeTimer.current = undefined;
        try {
          closePhone();
        } finally {
          resolve();
        }
      }, reduceMotion ? 0 : PHONE_CLOSE_ANIMATION_MS);
    });
    return closePromise.current;
  }, [closePhone]);

  /**
   * 消费剧情模式的一次原生 pointer 事件。
   * WeakSet 确保同一事件经过 React 的 pointer/mouse 捕获链时只推进一次；最后一条请求关闭时仅启动关闭动画，
   * 序列 Promise 仍由扩展 closePhone 回调完成。
   */
  const consumeStoryPointerEvent = useCallback((event: globalThis.PointerEvent): boolean => {
    if (PROCESSED_STORY_POINTER_EVENTS.has(event)) return false;
    PROCESSED_STORY_POINTER_EVENTS.add(event);

    const result = advanceStoryMessage?.();
    if (!result) return false;
    if (result === "close") void closeWithAnimation();
    return true;
  }, [advanceStoryMessage, closeWithAnimation]);

  /**
   * 统一启动应用目标，保证鼠标与键盘最终走相同的 Studio API 分支。
   * 启动锁会忽略关闭动画期间的重复请求；先等待 `closeWithAnimation`，再调用可能切换 UI、系统槽、Fragment、存档或窗口状态的目标。
   * 失败只记录日志，finally 必定释放 busy 状态，避免一次错误永久禁用桌面。
   */
  const launchApp = async (app: ResolvedPhoneApp) => {
    if (!isPhoneMounted()) {
      showMessage("手机尚未挂载");
      return;
    }
    if (busy || closing) return;
    setBusy(true);
    try {
      await closeWithAnimation();
      // 卸载可能发生在关闭动画期间；此时不得继续启动任何 UI、Fragment 或本地命令。
      if (!isPhoneMounted()) return;
      await launchPhoneTarget(ctx, app.action.target);
    } catch (error) {
      console.error(`[phone] 启动应用“${app.displayName}”失败`, error);
    } finally {
      setBusy(false);
    }
  };

  const handleStoryAdvancePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      !messageMode ||
      !awaitingStoryAdvance ||
      closing ||
      !consumeStoryPointerEvent(event.nativeEvent)
    ) return;

    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  };

  const suppressStoryMouseEvent = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!messageMode || !awaitingStoryAdvance || closing) return;
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  };

  /**
   * 手机根节点的键盘输入状态机。
   * 剧情模式优先消费 Escape、Enter 与 Space；编辑模式只处理 Escape；普通桌面模式跳过 input/textarea/contenteditable，
   * 将方向键交给四列焦点导航、Enter/Space 交给与鼠标相同的应用启动函数。被手机处理的键都会阻止冒泡，避免推进底层剧情。
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (closing) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (messageMode) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        void closeWithAnimation();
      } else if (event.key === "Enter" || event.key === " ") {
        const result = advanceStoryMessage?.();
        if (result) {
          event.preventDefault();
          event.stopPropagation();
          if (result === "close") void closeWithAnimation();
        }
      }
      return;
    }
    if (editorOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setEditorOpen(false);
      }
      return;
    }
    if (isTextInput(event.target)) return;

    const direction = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    }[event.key] as "up" | "down" | "left" | "right" | undefined;

    if (direction) {
      event.preventDefault();
      event.stopPropagation();
      moveFocus(direction);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      const app = apps.find((item) => item.id === focusedAppId);
      if (app) void launchApp(app);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      void closeWithAnimation();
    }
  };

  const handleWheelCapture = (event: React.WheelEvent<HTMLDivElement>) => {
    // 保留手机内部 overflow 容器的默认滚动；只阻止 wheel 到达底层剧情输入处理器。
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  };

  const handleOutsidePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) void closeWithAnimation();
  };

  const updateAppOverride = (
    appId: string,
    patch: { name?: string; imageDataUrl?: string },
  ) => {
    setDraft((current) => {
      const existing = current.appOverrides.find((item) => item.appId === appId);
      const next = { ...existing, appId, ...patch };
      const keep = Boolean(next.name || next.imageDataUrl);
      return {
        ...current,
        appOverrides: [
          ...current.appOverrides.filter((item) => item.appId !== appId),
          ...(keep ? [next] : []),
        ],
      };
    });
  };

  const updateActionBinding = (appId: string, actionId: string) => {
    setDraft((current) => ({
      ...current,
      actionBindings: [
        ...current.actionBindings.filter((item) => item.appId !== appId),
        { appId, actionId },
      ],
    }));
  };

  const updateActionOverride = (action: PhoneActionDefinition) => {
    setDraft((current) => ({
      ...current,
      actionOverrides: [
        ...current.actionOverrides.filter((item) => item.id !== action.id),
        action,
      ],
    }));
  };

  const updateSelectedAction = (patch: Partial<PhoneActionDefinition>) => {
    if (!selectedAction) return;
    updateActionOverride({ ...selectedAction, ...patch });
  };

  const updateSelectedTarget = (target: PhoneTarget) => {
    updateSelectedAction({ target });
  };

  const addAction = () => {
    const usedIds = new Set(catalog.actions.map((action) => action.id));
    let index = 1;
    while (usedIds.has(`custom-action-${index}`)) index += 1;
    const action: PhoneActionDefinition = {
      id: `custom-action-${index}`,
      name: `自定义动作 ${index}`,
      target: { kind: "local-command", commandId: "quick-save" },
    };
    updateActionOverride(action);
    setSelectedActionId(action.id);
  };

  const resetSelectedAction = () => {
    if (!selectedAction) return;
    setDraft((current) => ({
      ...current,
      actionOverrides: current.actionOverrides.filter((item) => item.id !== selectedAction.id),
      actionBindings: baseCatalog.actions.some((action) => action.id === selectedAction.id)
        ? current.actionBindings
        : current.actionBindings.filter((item) => item.actionId !== selectedAction.id),
    }));
  };

  const openEditor = () => {
    if (!playerCustomizationEnabled) return;
    setDraft(preferences);
    const initialApp = apps.find((app) => app.id === focusedAppId) ?? apps[0];
    setSelectedAppId(initialApp?.id ?? "");
    setSelectedActionId(initialApp?.actionId ?? catalog.actions[0]?.id ?? "");
    setEditorOpen(true);
  };

  const saveDraft = () => {
    for (const action of draft.actionOverrides) {
      const error = getPhoneActionValidationError(action);
      if (error) {
        setSelectedActionId(action.id);
        showMessage(`动作“${action.name || action.id}”：${error}`);
        return;
      }
    }
    const normalized = normalizePreferences([draft]);
    persistPreferences([normalized]);
    setEditorOpen(false);
    showMessage("个性化设置已保存");
  };

  const resetPreferences = () => {
    persistPreferences([]);
    setDraft(emptyPreferences());
    setEditorOpen(false);
    showMessage("已恢复项目默认设置");
  };

  const handleWallpaperFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const wallpaperDataUrl = await readImage(file, MAX_WALLPAPER_BYTES);
      setDraft((current) => ({ ...current, wallpaperDataUrl }));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "背景图片读取失败");
    }
  };

  const handleIconFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedApp) return;
    try {
      const imageDataUrl = await readImage(file, MAX_ICON_BYTES);
      updateAppOverride(selectedApp.id, { imageDataUrl });
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "图标读取失败");
    }
  };

  // 宿主显式打开 `phone`（包括 Studio 的“程序预览”）时始终渲染默认手机。
  // `mount-phone` 仍门控 ArrowUp、show-message 和应用启动，不允许未挂载状态绕过剧情能力。
  // 卸载路径会主动 hide UI，因此这里不应因未挂载而将程序预览关闭。

  return (
    <div
      data-phone-root="ext-7a9373"
      data-phone-position={messageMode ? displayStoryPopupPosition : popupPosition}
      data-phone-closing={closing ? "true" : "false"}
      data-phone-message-mode={messageMode ? "true" : "false"}
      data-phone-awaiting-advance={awaitingStoryAdvance ? "true" : "false"}
      style={rootStyle}
      onKeyDownCapture={handleKeyDown}
      onWheelCapture={handleWheelCapture}
      onPointerDownCapture={messageMode ? handleStoryAdvancePointerDown : undefined}
      onMouseDownCapture={messageMode ? suppressStoryMouseEvent : undefined}
      onClickCapture={messageMode ? suppressStoryMouseEvent : undefined}
      onPointerDown={messageMode ? undefined : handleOutsidePointerDown}
    >
      <style>{phoneCss}</style>
      <section
        className="phone-shell"
        role={messageMode ? "status" : "dialog"}
        aria-modal={messageMode ? undefined : true}
        aria-label={messageMode ? "手机剧情消息" : phoneTitle ?? "手机"}
      >
        <div className="phone-screen" style={screenStyle}>
          <header className="phone-status">
            <time>{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            <span className="phone-status-icons" aria-hidden="true">
              <svg
                className="phone-status-icon phone-signal-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 1024 1024"
                focusable="false"
              >
                <path d="M0 0h1024v1024H0z" fill="none" />
                <path
                  fill="#fff"
                  d="M584 352H440c-17.7 0-32 14.3-32 32v544c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V384c0-17.7-14.3-32-32-32M892 64H748c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32M276 640H132c-17.7 0-32 14.3-32 32v256c0 17.7 14.3 32 32 32h144c17.7 0 32-14.3 32-32V672c0-17.7-14.3-32-32-32"
                />
              </svg>
              <svg
                className="phone-status-icon phone-wifi-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <path d="M0 0h24v24H0z" fill="none" />
                <path
                  fill="#fff"
                  d="M10.225 20.275Q9.5 19.55 9.5 18.5t.725-1.775T12 16t1.775.725t.725 1.775t-.725 1.775T12 21t-1.775-.725m5.338-9.675q1.687.6 3.062 1.65q.5.375.513.988T18.7 14.3q-.425.425-1.05.438t-1.125-.338q-.95-.65-2.1-1.025T12 13t-2.425.375t-2.1 1.025q-.5.35-1.125.325t-1.05-.45q-.425-.45-.425-1.062t.5-.988q1.375-1.05 3.063-1.638T12 10t3.563.6m2.324-5.575q2.763 1.025 4.963 2.9q.5.425.525 1.05t-.425 1.075q-.425.425-1.05.438t-1.125-.388q-1.8-1.475-4.037-2.287T12 7t-4.737.813T3.225 10.1q-.5.4-1.125.388t-1.05-.438Q.6 9.6.625 8.975t.525-1.05q2.2-1.875 4.963-2.9T12 4t5.888 1.025"
                />
              </svg>
              <svg
                className="phone-status-icon phone-battery-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <path d="M0 0h24v24H0z" fill="none" />
                <g fill="#fff">
                  <path d="M6 15a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h6v6z" />
                  <path
                    fillRule="evenodd"
                    d="M18 6H5a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13a3 3 0 0 0 3-3a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1a3 3 0 0 0-3-3m0 2H5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1"
                    clipRule="evenodd"
                  />
                </g>
              </svg>
            </span>
          </header>

          <div className="phone-toolbar">
            <h1 className="phone-title">{messageMode ? "消息" : phoneTitle ?? "手机"}</h1>
            {!messageMode && (
              <div style={{ display: "flex", gap: 8 }}>
                {playerCustomizationEnabled && (
                  <button
                    type="button"
                    className="phone-round-button"
                    aria-label="个性化手机"
                    title="个性化手机"
                    onClick={openEditor}
                  >
                    ⚙
                  </button>
                )}
                <button
                  type="button"
                  className="phone-round-button"
                  aria-label="关闭手机"
                  title="关闭手机"
                  onClick={() => void closeWithAnimation()}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {messageMode ? (
            <main
              ref={storyListRef}
              className="phone-story-message"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="手机消息列表"
            >
              {displayStoryMessages.map((storyMessage, index) => {
                const messageKey = `${storyMessage.chatRoleId}-${storyMessage.direction}-${storyMessage.status}-${index}`;
                return (
                  <React.Fragment key={messageKey}>
                    <PhoneStoryMessageItem storyMessage={storyMessage} />
                    {storyMessage.status === "blocked" ? (
                      <p className="phone-story-blocked-hint" role="status">
                        {storyMessage.blockedHint ?? "您的消息已发送，但被对方拒收"}
                      </p>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </main>
          ) : (
            <main className="phone-app-grid" aria-label="应用列表">
              {apps.map((app) => {
                const iconUrl = resolveAssetUrl(ctx, app.iconSource);
                return (
                  <button
                    key={app.id}
                    ref={(element) => {
                      if (element) appRefs.current.set(app.id, element);
                      else appRefs.current.delete(app.id);
                    }}
                    type="button"
                    className="phone-app"
                    data-selected={focusedAppId === app.id}
                    tabIndex={focusedAppId === app.id ? 0 : -1}
                    aria-label={`${app.displayName}，动作：${app.action.name}`}
                    title={app.action.description ?? `执行：${app.action.name}`}
                    onFocus={() => setFocusedAppId(app.id)}
                    onMouseEnter={() => setFocusedAppId(app.id)}
                    onClick={() => void launchApp(app)}
                    disabled={busy}
                  >
                    <span className="phone-app-icon" aria-hidden="true">
                      {iconUrl ? <img src={iconUrl} alt="" /> : firstGlyph(app.displayName)}
                    </span>
                    <span className="phone-app-name">{app.displayName}</span>
                  </button>
                );
              })}
            </main>
          )}

          <div className="phone-home-indicator" aria-hidden="true" />

          {!messageMode && playerCustomizationEnabled && editorOpen && (
            <div className="phone-editor-backdrop">
              <section className="phone-editor" aria-label="手机个性化设置">
                <div className="phone-editor-header">
                  <h2>个性化手机</h2>
                  <button
                    type="button"
                    className="phone-round-button"
                    aria-label="取消编辑"
                    onClick={() => setEditorOpen(false)}
                  >
                    ×
                  </button>
                </div>

                {selectedApp && (
                  <>
                    <label className="phone-field">
                      编辑应用
                      <select
                        value={selectedApp.id}
                        onChange={(event) => setSelectedAppId(event.target.value)}
                      >
                        {apps.map((app) => (
                          <option key={app.id} value={app.id}>{app.displayName}</option>
                        ))}
                      </select>
                    </label>

                    <label className="phone-field">
                      应用名称
                      <input
                        value={selectedApp.displayName}
                        maxLength={24}
                        disabled={selectedApp.locked}
                        onChange={(event) => updateAppOverride(selectedApp.id, { name: event.target.value })}
                      />
                    </label>

                    <label className="phone-field">
                      点击后执行
                      <select
                        value={selectedApp.actionId}
                        disabled={selectedApp.locked}
                        onChange={(event) => updateActionBinding(selectedApp.id, event.target.value)}
                      >
                        {catalog.actions.map((action) => (
                          <option key={action.id} value={action.id}>{action.name}</option>
                        ))}
                      </select>
                      {selectedApp.action.description && <span>{selectedApp.action.description}</span>}
                    </label>

                    {allowPlayerIcons !== false && !selectedApp.locked && (
                      <div className="phone-field">
                        应用图标
                        <label className="phone-file-button">
                          选择 PNG / JPEG / WebP（最大 512 KB）
                          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleIconFile} />
                        </label>
                        <button
                          type="button"
                          className="phone-action-button"
                          onClick={() => updateAppOverride(selectedApp.id, { imageDataUrl: undefined })}
                        >
                          恢复默认图标
                        </button>
                      </div>
                    )}
                  </>
                )}

                <section className="phone-action-editor">
                  <div className="phone-action-editor-title">
                    <div>
                      <h3>动作表单</h3>
                      <span>表单会自动生成并校验动作 JSON</span>
                    </div>
                    <button type="button" className="phone-action-button" onClick={addAction}>
                      新增动作
                    </button>
                  </div>

                  <label className="phone-field">
                    编辑动作
                    <select
                      value={selectedAction?.id ?? ""}
                      onChange={(event) => setSelectedActionId(event.target.value)}
                    >
                      {catalog.actions.map((action) => (
                        <option key={action.id} value={action.id}>{action.name}（{action.id}）</option>
                      ))}
                    </select>
                  </label>

                  {selectedAction && (
                    <>
                      <label className="phone-field">
                        动作 ID（稳定引用）
                        <input value={selectedAction.id} readOnly />
                      </label>
                      <label className="phone-field">
                        动作名称
                        <input
                          value={selectedAction.name}
                          maxLength={32}
                          onChange={(event) => updateSelectedAction({ name: event.target.value })}
                        />
                      </label>
                      <label className="phone-field">
                        动作说明
                        <input
                          value={selectedAction.description ?? ""}
                          maxLength={160}
                          onChange={(event) => updateSelectedAction({
                            description: event.target.value || undefined,
                          })}
                        />
                      </label>
                      <label className="phone-field">
                        动作类型
                        <select
                          value={selectedAction.target.kind}
                          onChange={(event) => updateSelectedTarget(
                            createDefaultTarget(event.target.value as PhoneTarget["kind"]),
                          )}
                        >
                          {Object.entries(TARGET_TYPE_LABELS).map(([kind, label]) => (
                            <option key={kind} value={kind}>{label}</option>
                          ))}
                        </select>
                      </label>

                      {selectedAction.target.kind === "program-ui" && (
                        <label className="phone-field">
                          程序 UI 引用
                          <input
                            placeholder="本扩展：ui-id；跨扩展：extension-id/ui-id"
                            value={selectedAction.target.ref}
                            onChange={(event) => updateSelectedTarget({
                              ...selectedAction.target as Extract<PhoneTarget, { kind: "program-ui" }>,
                              ref: event.target.value,
                            })}
                          />
                          <span>程序 UI 引用不要添加 @ 前缀。</span>
                        </label>
                      )}

                      {selectedAction.target.kind === "visual-ui" && (
                        <>
                          <label className="phone-field">
                            可视化 UI 名称
                            <input
                              placeholder="项目：ui-name；扩展：@extension-id/ui-name"
                              value={selectedAction.target.name}
                              onChange={(event) => updateSelectedTarget({
                                ...selectedAction.target as Extract<PhoneTarget, { kind: "visual-ui" }>,
                                name: event.target.value,
                              })}
                            />
                          </label>
                          <label className="phone-checkbox-field">
                            <input
                              type="checkbox"
                              checked={selectedAction.target.modal !== false}
                              onChange={(event) => updateSelectedTarget({
                                ...selectedAction.target as Extract<PhoneTarget, { kind: "visual-ui" }>,
                                modal: event.target.checked,
                              })}
                            />
                            作为模态界面打开
                          </label>
                        </>
                      )}

                      {selectedAction.target.kind === "system-slot" && (
                        <label className="phone-field">
                          系统界面
                          <select
                            value={selectedAction.target.slot}
                            onChange={(event) => updateSelectedTarget({
                              kind: "system-slot",
                              slot: event.target.value as typeof selectedAction.target.slot,
                            })}
                          >
                            {PHONE_SYSTEM_SLOT_IDS.map((slot) => (
                              <option key={slot} value={slot}>{INTERNAL_SYSTEM_SLOTS[slot].label}</option>
                            ))}
                          </select>
                        </label>
                      )}

                      {selectedAction.target.kind === "extension-method" && (
                        <>
                          <label className="phone-field">
                            扩展方法引用
                            <input
                              placeholder="extension-id/method-id"
                              value={selectedAction.target.methodRef}
                              onChange={(event) => updateSelectedTarget({
                                ...selectedAction.target as Extract<PhoneTarget, { kind: "extension-method" }>,
                                methodRef: event.target.value,
                              })}
                            />
                            <span>用于校验和标识；当前 SDK 需由下方 Fragment 中的“调用扩展方法”动作块实际执行。</span>
                          </label>
                          <div className="phone-field-row">
                            <label className="phone-field">
                              方法适配 Fragment ID
                              <input
                                value={selectedAction.target.fragmentId}
                                onChange={(event) => updateSelectedTarget({
                                  ...selectedAction.target as Extract<PhoneTarget, { kind: "extension-method" }>,
                                  fragmentId: event.target.value,
                                })}
                              />
                            </label>
                            <label className="phone-field">
                              章节 ID（可选）
                              <input
                                value={selectedAction.target.chapterId ?? ""}
                                onChange={(event) => updateSelectedTarget({
                                  ...selectedAction.target as Extract<PhoneTarget, { kind: "extension-method" }>,
                                  chapterId: event.target.value || undefined,
                                })}
                              />
                            </label>
                          </div>
                        </>
                      )}

                      {selectedAction.target.kind === "fragment" && (
                        <div className="phone-field-row">
                          <label className="phone-field">
                            Fragment ID
                            <input
                              value={selectedAction.target.fragmentId}
                              onChange={(event) => updateSelectedTarget({
                                ...selectedAction.target as Extract<PhoneTarget, { kind: "fragment" }>,
                                fragmentId: event.target.value,
                              })}
                            />
                          </label>
                          <label className="phone-field">
                            章节 ID（可选）
                            <input
                              value={selectedAction.target.chapterId ?? ""}
                              onChange={(event) => updateSelectedTarget({
                                ...selectedAction.target as Extract<PhoneTarget, { kind: "fragment" }>,
                                chapterId: event.target.value || undefined,
                              })}
                            />
                          </label>
                        </div>
                      )}

                      {selectedAction.target.kind === "local-command" && (
                        <label className="phone-field">
                          手机内部方法
                          <select
                            value={selectedAction.target.commandId}
                            onChange={(event) => updateSelectedTarget({
                              kind: "local-command",
                              commandId: event.target.value as LocalCommandId,
                            })}
                          >
                            {Object.entries(LOCAL_COMMAND_LABELS).map(([id, label]) => (
                              <option key={id} value={id}>{label}</option>
                            ))}
                          </select>
                        </label>
                      )}

                      <button
                        type="button"
                        className="phone-action-button danger"
                        onClick={resetSelectedAction}
                      >
                        {baseCatalog.actions.some((action) => action.id === selectedAction.id)
                          ? "恢复该动作的 JSON 默认值"
                          : "删除该自定义动作"}
                      </button>
                    </>
                  )}
                </section>

                {allowPlayerWallpaper !== false && (
                  <div className="phone-field">
                    手机背景图片
                    <label className="phone-file-button">
                      选择 PNG / JPEG / WebP（最大 2 MB）
                      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleWallpaperFile} />
                    </label>
                    <button
                      type="button"
                      className="phone-action-button"
                      onClick={() => setDraft((current) => ({ ...current, wallpaperDataUrl: undefined }))}
                    >
                      恢复默认背景图片
                    </button>
                  </div>
                )}

                <label className="phone-field">
                  CSS 背景值
                  <textarea
                    rows={2}
                    maxLength={2048}
                    placeholder="linear-gradient(135deg, #182848, #4b6cb7)"
                    value={draft.backgroundCss ?? ""}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      backgroundCss: event.target.value || undefined,
                    }))}
                  />
                  <span>仅接受单个 background 值，不允许 url()、@ 规则、分号或花括号。</span>
                </label>

                <div className="phone-field-row">
                  <label className="phone-field">
                    强调色
                    <input
                      type="color"
                      value={draft.accentColor ?? defaultAccentColor ?? "#79c7ff"}
                      onChange={(event) => setDraft((current) => ({ ...current, accentColor: event.target.value }))}
                    />
                  </label>
                  <label className="phone-field">
                    外壳颜色
                    <input
                      type="color"
                      value={draft.shellColor ?? defaultShellColor ?? "#11151f"}
                      onChange={(event) => setDraft((current) => ({ ...current, shellColor: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="phone-editor-actions">
                  <button type="button" className="phone-action-button" onClick={resetPreferences}>
                    恢复默认
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="phone-action-button" onClick={() => setEditorOpen(false)}>
                      取消
                    </button>
                    <button type="button" className="phone-action-button primary" onClick={saveDraft}>
                      保存
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {message && <div className="phone-message" role="status" aria-live="polite">{message}</div>}
        </div>
      </section>
    </div>
  );
};

/**
 * 对外导出的手机 UI 根组件。
 * 只应由 PhoneExtension.render 传入完整 PhoneUIProps；错误边界会隔离渲染期异常，但事件处理器和异步启动失败仍由内部流程记录。
 */
export const PhoneUI: React.FC<PhoneUIProps> = (props) => (
  <PhoneErrorBoundary closePhone={props.closePhone}>
    <PhoneUIContent {...props} />
  </PhoneErrorBoundary>
);
