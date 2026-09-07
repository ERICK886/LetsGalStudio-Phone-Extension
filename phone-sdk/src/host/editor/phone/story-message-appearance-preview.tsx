/**
 * @file story-message-appearance-preview.tsx
 * @description 「手机」Tab · 消息手机中栏预览：只预览当前选中的一个角色预设。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @example
 * ```tsx
 * <StoryMessageAppearancePreview
 *   mode="presets"
 *   selectedPreset={preset}
 *   values={fieldValues}
 * />
 * ```
 */

import React, {
  useMemo,
  type CSSProperties,
} from "react";
import { useExtensionContext } from "@avg-studio/sdk";
import type { Character, ExtensionContext } from "@avg-studio/sdk";

import { buildBubbleStyleParts } from "../../phone/extension/chat-role-bubble-style";
import { sanitizeBackgroundCss } from "../../phone/catalog";
import { firstGlyph, resolveAssetUrl } from "../../phone/ui/asset-utils";
import phoneCss from "../../phone/ui/styles/phone.css?inline";
import type { EditableChatRolePreset } from "../chat/chat-role-presets-bridge";
import { readEditableChatAvatarAssets } from "../chat/chat-role-presets-bridge";
import { readPhoneAppearanceValues } from "../phone/phone-settings-bridge";
import previewOverrideCss from "../phone/phone-editor-preview.css?inline";
import { PhonePreviewStatusBar } from "../phone/phone-preview-status-bar";
import { useTheme } from "../theme/theme-provider";

/** 消息手机预览模式。 */
export type StoryMessagePreviewMode = "presets" | "behavior";

/**
 * StoryMessageAppearancePreview 属性。
 */
export interface StoryMessageAppearancePreviewProps {
  mode: StoryMessagePreviewMode;
  /** 含 markOutgoingUnread… 等字段 */
  values: Record<string, string>;
  /** 当前选中预设（预览只展示这一项） */
  selectedPreset?: EditableChatRolePreset | null;
  refreshToken?: number | string;
}

/**
 * 预览用单条剧情消息。
 */
function PreviewStoryRow({
  direction,
  status,
  name,
  message,
  showAvatar,
  showName,
  avatarUrl,
  avatarGlyph,
  bubbleStyle,
  nameStyle,
  bodyStyle,
  avatarKey,
}: {
  direction: "incoming" | "outgoing";
  status: "read" | "unread";
  name: string;
  message: string;
  showAvatar: boolean;
  showName: boolean;
  avatarUrl?: string;
  avatarGlyph: string;
  bubbleStyle?: CSSProperties;
  nameStyle?: CSSProperties;
  bodyStyle?: CSSProperties;
  /** 区分预设，避免 img 复用错图 */
  avatarKey?: string;
}): React.ReactElement {
  return (
    <div
      className="phone-story-message-row"
      data-direction={direction}
      data-status={status}
      data-show-avatar={showAvatar ? "true" : "false"}
      data-show-name={showName ? "true" : "false"}
    >
      {showAvatar ? (
        <div className="phone-story-avatar" aria-hidden="true">
          {avatarUrl ? (
            <img key={avatarKey ?? avatarUrl} src={avatarUrl} alt="" />
          ) : (
            avatarGlyph
          )}
        </div>
      ) : null}
      <div className="phone-story-message-body">
        <div className="phone-story-message-content">
          {showName ? (
            <div className="phone-story-name" style={nameStyle}>
              {name}
            </div>
          ) : null}
          <span className="phone-story-status" role="status">
            <span className="phone-story-status-text">
              {status === "unread" ? "未读" : "已读"}
            </span>
          </span>
          <div className="phone-story-bubble" style={bubbleStyle}>
            <p style={bodyStyle}>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 按 id 取角色（禁止在多行预览里用 useCharacter：Studio hook 会串台，
 * 导致多条消息都显示最后一个预设的头像）。
 *
 * @param ctx - 扩展上下文
 * @param characterId - 角色 id
 * @param all - 可选，来自 useAll() 的列表以触发重渲染
 * @returns Character 或 null
 */
function resolveCharacterById(
  ctx: ExtensionContext,
  characterId: string,
  all?: readonly Character[],
): Character | null {
  const id = characterId.trim();
  if (!id) return null;

  const fromGet = ctx.character.get(id);
  if (fromGet && fromGet.id === id) return fromGet;

  const pool = all ?? ctx.character.list();
  return pool.find((item) => item.id === id) ?? null;
}

/**
 * 解析单个预设的显示名与头像 URL（与运行时 normalize 对齐）。
 *
 * @param ctx - 上下文
 * @param preset - 预设
 * @param character - 已解析角色
 * @returns name / avatarUrl / glyph
 */
function resolvePresetPresentation(
  ctx: ExtensionContext,
  preset: EditableChatRolePreset,
  character: Character | null,
): { name: string; avatarUrl?: string; glyph: string } {
  const fromAsset = character?.name?.trim();
  const presetId = preset.id.trim();
  const name =
    fromAsset ||
    (presetId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(presetId) &&
    presetId.length <= 24
      ? presetId
      : "角色");

  let avatarUrl: string | undefined;

  if (preset.avatarSource === "asset") {
    const assetId = preset.avatarAssetId.trim();
    if (assetId) {
      const row = readEditableChatAvatarAssets(ctx).find(
        (item) => item.id === assetId,
      );
      avatarUrl = resolveAssetUrl(ctx, row?.asset || undefined);
    }
  } else if (preset.avatarSource === "character-avatar") {
    avatarUrl = resolveAssetUrl(ctx, character?.avatarUri);
  } else {
    // first-portrait：严格用「该 characterId」的第一张立绘，不用其它角色
    avatarUrl = resolveAssetUrl(ctx, character?.portraits?.[0]?.uri);
  }

  return { name, avatarUrl, glyph: firstGlyph(name) };
}

/**
 * 单条「按预设」对方消息：按 characterId 独立 get/list，不用 useCharacter。
 */
function PresetIncomingRow({
  preset,
  message,
  emphasize,
}: {
  preset: EditableChatRolePreset;
  message: string;
  /** 是否为当前选中（应用气泡自定义样式） */
  emphasize: boolean;
}): React.ReactElement {
  const ctx = useExtensionContext();
  /** 订阅全表以便角色资产变更时刷新；查找必须按 id，禁止 useCharacter(id) 多实例 */
  const allCharacters = ctx.character.useAll();
  const characterId = preset.characterId.trim();

  const character = useMemo(
    () => resolveCharacterById(ctx, characterId, allCharacters),
    [allCharacters, characterId, ctx],
  );

  const presentation = useMemo(
    () => resolvePresetPresentation(ctx, preset, character),
    [character, ctx, preset],
  );

  const styleParts = useMemo(() => {
    if (!emphasize) return undefined;
    return buildBubbleStyleParts({
      fontSize: preset.fontSize,
      textColor: preset.textColor,
      nameColor: preset.nameColor,
      bubbleColor: preset.bubbleColor,
      customCss: preset.customCss || undefined,
    });
  }, [emphasize, preset]);

  const bubbleStyle =
    styleParts && Object.keys(styleParts.bubble).length > 0
      ? (styleParts.bubble as CSSProperties)
      : undefined;
  const nameStyle =
    styleParts && Object.keys(styleParts.name).length > 0
      ? (styleParts.name as CSSProperties)
      : undefined;
  const bodyStyle =
    styleParts && Object.keys(styleParts.body).length > 0
      ? (styleParts.body as CSSProperties)
      : undefined;

  const avatarKey = `${preset.id}:${characterId}:${presentation.avatarUrl ?? ""}`;

  return (
    <PreviewStoryRow
      direction="incoming"
      status="read"
      name={presentation.name}
      message={message}
      showAvatar={preset.showAvatar !== false}
      showName={preset.showName !== false}
      avatarUrl={presentation.avatarUrl}
      avatarGlyph={presentation.glyph}
      bubbleStyle={bubbleStyle}
      nameStyle={nameStyle}
      bodyStyle={bodyStyle}
      avatarKey={avatarKey}
    />
  );
}

/**
 * 撤回系统行（按 id get，不用 useCharacter）。
 */
function RecallHint({
  preset,
}: {
  preset: EditableChatRolePreset;
}): React.ReactElement {
  const ctx = useExtensionContext();
  const allCharacters = ctx.character.useAll();
  const character = useMemo(
    () => resolveCharacterById(ctx, preset.characterId, allCharacters),
    [allCharacters, ctx, preset.characterId],
  );
  const name = character?.name?.trim() || preset.id.trim() || "角色";
  return (
    <p className="phone-story-recall-hint" role="status">
      {name}撤回了一条消息
    </p>
  );
}

const SAMPLE_LINES = [
  "哥哥在干嘛",
  "没有的话可不可以出去吃",
  "今天天气不错",
] as const;

/**
 * 消息手机中栏预览。
 *
 * @param props - StoryMessageAppearancePreviewProps
 * @returns 预览节点
 */
export function StoryMessageAppearancePreview({
  mode,
  values,
  selectedPreset = null,
  refreshToken = 0,
}: StoryMessageAppearancePreviewProps): React.ReactElement {
  const ctx = useExtensionContext();
  const { tokens } = useTheme();
  const phoneValues = useMemo(() => {
    void refreshToken;
    return readPhoneAppearanceValues(ctx);
  }, [ctx, refreshToken]);

  const stylePreset =
    phoneValues.phoneStylePreset === "android" ? "android" : "apple";

  const wallpaperUrl = useMemo(
    () => resolveAssetUrl(ctx, phoneValues.backgroundImage || undefined),
    [ctx, phoneValues.backgroundImage],
  );
  const backgroundCss = sanitizeBackgroundCss(phoneValues.backgroundCss);

  const screenStyle: CSSProperties = useMemo(() => {
    const color = phoneValues.backgroundColor || "#172036";
    if (backgroundCss) return { background: backgroundCss };
    if (wallpaperUrl) {
      return {
        backgroundColor: color,
        backgroundImage: `linear-gradient(rgba(4, 8, 16, .12), rgba(4, 8, 16, .28)), url(${JSON.stringify(wallpaperUrl)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return { background: color };
  }, [backgroundCss, wallpaperUrl, phoneValues.backgroundColor]);

  const rootStyle = {
    "--phone-accent": phoneValues.accentColor || "#79c7ff",
    "--phone-shell": phoneValues.shellColor || "#11151f",
  } as CSSProperties;

  const markRead =
    (values.markOutgoingUnreadReadBeforeIncoming ?? "true") === "true";
  const outgoingUnread = mode === "behavior" ? !markRead : true;
  const previewKey = `${selectedPreset?.id ?? "none"}:${selectedPreset?.characterId ?? ""}`;

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
      {mode === "behavior" ? (
        <div
          style={{
            flex: "0 0 auto",
            padding: "8px 12px",
            fontSize: 11,
            lineHeight: 1.45,
            color: tokens.textSecondary,
            borderBottom: `1px solid ${tokens.border}`,
            background: tokens.bgElevated,
          }}
        >
          对方回复前标已读：
          <strong style={{ color: tokens.textPrimary }}>
            {markRead ? "开启" : "关闭"}
          </strong>
          {markRead
            ? " — 示意：推进对方消息前，我方「未读」会先变为「已读」。"
            : " — 示意：可直接出现对方消息，我方仍可保持「未读」。"}
        </div>
      ) : null}

      <div
        data-phone-root="phone-editor-story-preview"
        data-phone-editor-preview=""
        data-phone-style-preset={stylePreset}
        data-phone-position="center"
        data-phone-closing="false"
        data-phone-message-mode="true"
        data-phone-awaiting-advance="false"
        data-phone-in-app="false"
        data-phone-in-app-phase="idle"
        style={{ ...rootStyle, flex: "1 1 auto", minHeight: 0 }}
      >
        <style>{phoneCss}</style>
        <style>{previewOverrideCss}</style>

        <section className="phone-shell" aria-label="消息手机预览">
          <div className="phone-screen" style={screenStyle}>
            <PhonePreviewStatusBar stylePreset={stylePreset} />

            <div className="phone-toolbar">
              <h1 className="phone-title">消息</h1>
            </div>

            <main
              key={previewKey}
              className="phone-story-message"
              role="log"
              aria-label="消息手机预览列表"
            >
              {!selectedPreset ? (
                <p className="phone-story-recall-hint" role="status">
                  请选择一个角色预设以预览。
                </p>
              ) : (
                <>
                  <PresetIncomingRow
                    preset={selectedPreset}
                    message={SAMPLE_LINES[0]}
                    emphasize
                  />

                  <RecallHint preset={selectedPreset} />

                  <PreviewStoryRow
                    direction="outgoing"
                    status={outgoingUnread ? "unread" : "read"}
                    name="我"
                    message="啊?"
                    showAvatar
                    showName
                    avatarGlyph="我"
                  />

                  <PresetIncomingRow
                    preset={selectedPreset}
                    message={SAMPLE_LINES[1]}
                    emphasize
                  />
                </>
              )}
            </main>
          </div>
        </section>
      </div>
    </div>
  );
}

export default StoryMessageAppearancePreview;
