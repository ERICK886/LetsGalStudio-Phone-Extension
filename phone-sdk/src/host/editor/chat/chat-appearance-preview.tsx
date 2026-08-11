/**
 * @file chat-appearance-preview.tsx
 * @description 「聊天APP」中栏：真机壳 + 聊天首页 / 气泡 / 消息行为预览。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.1
 */

import React, {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useExtensionContext } from "@avg-studio/sdk";

import phoneCss from "../../phone/ui/styles/phone.css?inline";
import { firstGlyph, resolveAssetUrl } from "../../phone/ui/asset-utils";
import { sanitizeBackgroundCss } from "../../phone/catalog";
import { useTheme } from "../theme/theme-provider";
import {
  readPhoneAppearanceValues,
} from "../phone/phone-settings-bridge";
import previewOverrideCss from "../phone/phone-editor-preview.css?inline";
import chatPreviewCss from "./chat-editor-preview.css?inline";
import type { EditableChatAttribute } from "./chat-attributes-bridge";
import type { EditableChatFriend } from "./chat-friends-bridge";
import type { EditableChatRolePreset } from "./chat-role-presets-bridge";
import { formatCharacterListLabel } from "./character-label";

/** 预览模式。 */
export type ChatPreviewMode =
  | "home-chats"
  | "home-friends"
  | "attributes"
  | "bubble"
  | "behavior";

/**
 * ChatAppearancePreview 属性。
 */
export interface ChatAppearancePreviewProps {
  /** 文案等标量（contentItem id → string） */
  values: Record<string, string>;
  mode: ChatPreviewMode;
  friends?: readonly EditableChatFriend[];
  attributes?: readonly EditableChatAttribute[];
  /** 气泡预览用选中预设；无则示意默认样式 */
  selectedPreset?: EditableChatRolePreset | null;
  refreshToken?: number | string;
}

/**
 * 状态栏图标（与桌面预览一致）。
 */
function PhoneStatusIcons(): React.ReactElement {
  return (
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
    </span>
  );
}

/**
 * 聊天编辑器中栏预览。
 *
 * @param props - ChatAppearancePreviewProps
 * @returns 预览节点
 */
export function ChatAppearancePreview({
  values,
  mode,
  friends = [],
  attributes = [],
  selectedPreset = null,
  refreshToken = 0,
}: ChatAppearancePreviewProps): React.ReactElement {
  const ctx = useExtensionContext();
  const { tokens } = useTheme();
  const [clock, setClock] = useState(() => new Date());
  const [previewTab, setPreviewTab] = useState<"chats" | "friends">("chats");

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mode === "home-friends" || mode === "attributes") {
      setPreviewTab("friends");
    } else if (mode === "home-chats") {
      setPreviewTab("chats");
    }
  }, [mode]);

  const phoneValues = useMemo(() => {
    void refreshToken;
    return readPhoneAppearanceValues(ctx);
  }, [ctx, refreshToken]);

  const stylePreset =
    phoneValues.phoneStylePreset === "android" ? "android" : "apple";
  const phoneTitle = (phoneValues.phoneTitle ?? "").trim() || "手机";

  const appTitle = (values.appTitle ?? "").trim() || "聊天";
  const chatsLabel = (values.chatsTabLabel ?? "").trim() || "聊天";
  const friendsLabel = (values.friendsTabLabel ?? "").trim() || "好友";
  const emptyChats =
    (values.emptyChatsHint ?? "").trim() || "暂无聊天";
  const emptyFriends =
    (values.emptyFriendsHint ?? "").trim() || "暂无好友";
  const markRead =
    (values.markOutgoingUnreadReadBeforeIncoming ?? "true") === "true";

  const wallpaperUrl = useMemo(
    () => resolveAssetUrl(ctx, phoneValues.backgroundImage || undefined),
    [ctx, phoneValues.backgroundImage],
  );

  /** 一次订阅全部角色，预览多行按 id 查名（勿对每行 useCharacter） */
  const allCharacters = ctx.character.useAll();
  const friendLabel = (characterId: string): string =>
    formatCharacterListLabel(characterId, allCharacters, (id) =>
      ctx.character.get(id),
    );
  const backgroundCss = sanitizeBackgroundCss(phoneValues.backgroundCss);

  const screenStyle: CSSProperties = useMemo(() => {
    const color = phoneValues.backgroundColor || "#172036";
    if (backgroundCss) return { background: backgroundCss };
    if (wallpaperUrl) {
      return {
        backgroundColor: color,
        backgroundImage: `linear-gradient(rgba(4, 8, 16, .08), rgba(4, 8, 16, .24)), url(${JSON.stringify(wallpaperUrl)})`,
      };
    }
    return { background: color };
  }, [backgroundCss, wallpaperUrl, phoneValues.backgroundColor]);

  const rootStyle = {
    "--phone-accent": phoneValues.accentColor || "#79c7ff",
    "--phone-shell": phoneValues.shellColor || "#11151f",
  } as CSSProperties;

  const bubbleStyle: CSSProperties = useMemo(() => {
    if (!selectedPreset) {
      return {
        background: "rgba(12, 18, 30, 0.84)",
        color: "#fff",
        fontSize: 14,
      };
    }
    // customCss 由下方 ref 注入；此处仅结构化字段
    return {
      background: selectedPreset.bubbleColor || "rgba(12, 18, 30, 0.84)",
      color: selectedPreset.textColor || "#fff",
      fontSize: selectedPreset.fontSize || "14px",
    };
  }, [selectedPreset]);

  const nameStyle: CSSProperties = {
    color: selectedPreset?.nameColor || "rgba(255,255,255,0.78)",
  };

  const customCss = selectedPreset?.customCss?.trim() ?? "";

  let body: React.ReactNode;

  if (mode === "bubble") {
    body = (
      <>
        <div className="phone-chat-preview-header">{appTitle}</div>
        <div className="phone-chat-preview-scroll">
          <div className="phone-chat-preview-bubbles">
            {selectedPreset?.showName !== false ? (
              <div className="phone-chat-preview-name" style={nameStyle}>
                {selectedPreset?.id || "角色预设"}
              </div>
            ) : null}
            <div
              className="phone-chat-preview-bubble"
              style={customCss ? undefined : bubbleStyle}
              ref={(node) => {
                if (!node) return;
                if (customCss) {
                  node.setAttribute("style", customCss);
                }
              }}
            >
              这是一条预览气泡，用于查看字号与颜色。
            </div>
          </div>
        </div>
      </>
    );
  } else if (mode === "behavior") {
    body = (
      <>
        <div className="phone-chat-preview-header">消息行为</div>
        <div className="phone-chat-preview-behavior">
          <p>
            「对方回复前将我方未读标为已读」当前为{" "}
            <strong>{markRead ? "开启" : "关闭"}</strong>。
          </p>
          <p>
            {markRead
              ? "有我方未读气泡时，下一条对方消息会先标已读再推进。"
              : "点击/按键会直接推进对方消息，不先标已读。"}
          </p>
        </div>
      </>
    );
  } else if (mode === "attributes") {
    body = (
      <>
        <div className="phone-chat-preview-header">好友详情 · 属性</div>
        <div className="phone-chat-preview-scroll">
          {attributes.length === 0 ? (
            <div className="phone-chat-preview-empty">未配置属性槽</div>
          ) : (
            attributes.map((attr) => (
              <div key={attr.id} className="phone-chat-preview-row">
                <div className="phone-chat-preview-row-text">
                  <div className="phone-chat-preview-row-title">{attr.label}</div>
                  <div className="phone-chat-preview-row-sub">
                    {attr.variableKey}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  } else {
    const showFriends = previewTab === "friends";
    body = (
      <>
        <div className="phone-chat-preview-header">{appTitle}</div>
        <div className="phone-chat-preview-scroll">
          {showFriends ? (
            friends.length === 0 ? (
              <div className="phone-chat-preview-empty">{emptyFriends}</div>
            ) : (
              friends.map((friend) => {
                const label = friendLabel(friend.characterId);
                return (
                <div key={friend.uid} className="phone-chat-preview-row">
                  <span className="phone-chat-preview-avatar">
                    {firstGlyph(label)}
                  </span>
                  <div className="phone-chat-preview-row-text">
                    <div className="phone-chat-preview-row-title">
                      {label}
                    </div>
                    <div className="phone-chat-preview-row-sub">默认好友</div>
                  </div>
                </div>
                );
              })
            )
          ) : friends.length === 0 ? (
            <div className="phone-chat-preview-empty">{emptyChats}</div>
          ) : (
            friends.map((friend) => {
              const label = friendLabel(friend.characterId);
              return (
              <div key={friend.uid} className="phone-chat-preview-row">
                <span className="phone-chat-preview-avatar">
                  {firstGlyph(label)}
                </span>
                <div className="phone-chat-preview-row-text">
                  <div className="phone-chat-preview-row-title">
                    {label}
                  </div>
                  <div className="phone-chat-preview-row-sub">会话示意</div>
                </div>
              </div>
              );
            })
          )}
        </div>
        <div className="phone-chat-preview-tabs">
          <button
            type="button"
            className="phone-chat-preview-tab"
            data-active={String(previewTab === "chats")}
            onClick={() => setPreviewTab("chats")}
          >
            {chatsLabel}
          </button>
          <button
            type="button"
            className="phone-chat-preview-tab"
            data-active={String(previewTab === "friends")}
            onClick={() => setPreviewTab("friends")}
          >
            {friendsLabel}
          </button>
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: tokens.bgSunken,
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <div
        data-phone-root="phone-editor-chat-preview"
        data-phone-editor-preview=""
        data-phone-editor-chat-preview=""
        data-phone-style-preset={stylePreset}
        data-phone-position="center"
        data-phone-closing="false"
        data-phone-message-mode="false"
        data-phone-in-app="true"
        data-phone-in-app-phase="open"
        style={{ ...rootStyle, flex: "1 1 auto", minHeight: 0 }}
      >
        <style>{phoneCss}</style>
        <style>{previewOverrideCss}</style>
        <style>{chatPreviewCss}</style>

        <section className="phone-shell" aria-label={`${phoneTitle} · 聊天预览`}>
          <div className="phone-screen" style={screenStyle}>
            <header className="phone-status">
              <time>
                {clock.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <PhoneStatusIcons />
            </header>
            <div className="phone-chat-preview-body">{body}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ChatAppearancePreview;
