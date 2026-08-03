import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";
import type { PhoneMessageStatus, PhoneStoryMessage } from "../../extension/phone-extension";
import { buildBubbleStyleParts } from "../../extension/chat-role-bubble-style";
import { firstGlyph, resolveAssetUrl } from "../asset-utils";

const MessageStatusIndicator: React.FC<{ status: PhoneMessageStatus }> = ({ status }) => {
  if (status === "sending") {
    return (
      <span className="phone-story-status-icon phone-story-status-loading" aria-label="发送中">
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="currentColor" d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Z" opacity=".5" />
          <path fill="currentColor" d="M20 12h2A10 10 0 0 0 12 2V4A8 8 0 0 1 20 12Z">
            <animateTransform attributeName="transform" dur="1s" from="0 12 12" repeatCount="indefinite" to="360 12 12" type="rotate" />
          </path>
        </svg>
      </span>
    );
  }
  if (status === "failed" || status === "blocked") {
    return (
      <span className="phone-story-status-icon phone-story-status-error" aria-label={status === "blocked" ? "已被拉黑" : "发送失败"}>
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M0 0h24v24H0z" fill="none" />
          <path fill="#fc4343" d="M12.713 16.713Q13 16.425 13 16t-.288-.712T12 15t-.712.288T11 16t.288.713T12 17t.713-.288m0-4Q13 12.425 13 12V8q0-.425-.288-.712T12 7t-.712.288T11 8v4q0 .425.288.713T12 13t.713-.288M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22" />
        </svg>
      </span>
    );
  }
  return <span className="phone-story-status-text">{status === "unread" ? "未读" : "已读"}</span>;
};

/**
 * 渲染一条手机剧情消息。聊天角色预设在方法执行时已经展开为快照，
 * 所以播放中不会因为作者修改预设而改变历史消息。
 */
export const PhoneStoryMessageItem: React.FC<{ storyMessage: PhoneStoryMessage }> = ({
  storyMessage,
}) => {
  const ctx = useExtensionContext();
  const character = ctx.character.useCharacter(storyMessage.characterId);
  const characterName = (character?.name ?? storyMessage.characterId) || "未知角色";
  const selectedPortrait = useMemo(() => {
    const portraitRef = storyMessage.portraitId;
    const portraits = character?.portraits ?? [];
    if (!portraitRef) return undefined;
    return portraits.find((portrait) => portrait.id === portraitRef)
      ?? portraits.find((portrait) => portrait.uri === portraitRef)
      ?? (() => {
        const normalizedRef = portraitRef.trim().normalize("NFC");
        const matches = portraits.filter(
          (portrait) => portrait.name?.trim().normalize("NFC") === normalizedRef,
        );
        return matches.length === 1 ? matches[0] : undefined;
      })();
  }, [character?.portraits, storyMessage.portraitId]);
  const avatarCandidates = useMemo(() => {
    const presetAvatarUri = storyMessage.avatarSource === "asset"
      ? storyMessage.avatarAsset
      : storyMessage.avatarSource === "character-avatar"
        ? character?.avatarUri
        : character?.portraits?.[0]?.uri;
    const candidateUris = [
      { source: `preset-${storyMessage.avatarSource}`, uri: presetAvatarUri },
      { source: "legacy-selected-portrait", uri: selectedPortrait?.uri },
      { source: "character-avatar", uri: character?.avatarUri },
      { source: "first-portrait", uri: character?.portraits?.[0]?.uri },
    ];
    const seenUrls = new Set<string>();
    return candidateUris.flatMap((candidate) => {
      const url = resolveAssetUrl(ctx, candidate.uri);
      if (!url || seenUrls.has(url)) return [];
      seenUrls.add(url);
      return [{ ...candidate, url }];
    });
  }, [character?.avatarUri, character?.portraits, ctx, selectedPortrait?.uri, storyMessage.avatarAsset, storyMessage.avatarSource]);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const avatarUrl = avatarCandidates[avatarIndex]?.url;

  useEffect(() => setAvatarIndex(0), [avatarCandidates]);

  const reportAvatarLoaded = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const candidate = avatarCandidates[avatarIndex];
    console.log("[phone-avatar] image-load-succeeded", {
      characterId: storyMessage.characterId,
      chatRoleId: storyMessage.chatRoleId,
      candidateSource: candidate?.source,
      rawUri: candidate?.uri,
      resolvedUrl: candidate?.url,
      imageCurrentSrc: event.currentTarget.currentSrc,
      naturalWidth: event.currentTarget.naturalWidth,
      naturalHeight: event.currentTarget.naturalHeight,
    });
  }, [avatarCandidates, avatarIndex, storyMessage.characterId, storyMessage.chatRoleId]);

  const tryNextAvatar = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const imageDetails = {
      currentSrc: image.currentSrc,
      src: image.src,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
    setAvatarIndex((current) => {
      const candidate = avatarCandidates[current];
      console.warn("[phone-avatar] image-load-failed", {
        characterId: storyMessage.characterId,
        chatRoleId: storyMessage.chatRoleId,
        candidateSource: candidate?.source,
        candidateIndex: current,
        candidateCount: avatarCandidates.length,
        rawUri: candidate?.uri,
        resolvedUrl: candidate?.url,
        image: imageDetails,
      });
      return current + 1 < avatarCandidates.length ? current + 1 : avatarCandidates.length;
    });
  }, [avatarCandidates, storyMessage.characterId, storyMessage.chatRoleId]);

  /**
   * Task 2 已在快照/render 阶段写入最终布尔；此处沿用「仅严格 false 为隐藏」语义。
   * @see PhoneStoryMessage.showAvatar / showName
   */
  const showAvatar = storyMessage.showAvatar !== false;
  const showName = storyMessage.showName !== false;

  /** 快照样式字段 → bubble / strong / p 三段 inline style；全无则 undefined，保留 outgoing 默认 CSS。 */
  const bubbleStyleParts = useMemo(() => {
    const { fontSize, textColor, nameColor, bubbleColor, customCss } = storyMessage;
    if (!fontSize && !textColor && !nameColor && !bubbleColor && !customCss) {
      return undefined;
    }

    return buildBubbleStyleParts({
      ...(fontSize ? { fontSize } : {}),
      ...(textColor ? { textColor } : {}),
      ...(nameColor ? { nameColor } : {}),
      ...(bubbleColor ? { bubbleColor } : {}),
      ...(customCss ? { customCss } : {}),
    });
  }, [
    storyMessage.fontSize,
    storyMessage.textColor,
    storyMessage.nameColor,
    storyMessage.bubbleColor,
    storyMessage.customCss,
  ]);

  const bubbleStyle =
    bubbleStyleParts && Object.keys(bubbleStyleParts.bubble).length > 0
      ? bubbleStyleParts.bubble
      : undefined;
  const nameStyle =
    bubbleStyleParts && Object.keys(bubbleStyleParts.name).length > 0
      ? bubbleStyleParts.name
      : undefined;
  const bodyStyle =
    bubbleStyleParts && Object.keys(bubbleStyleParts.body).length > 0
      ? bubbleStyleParts.body
      : undefined;

  return (
    <div
      className="phone-story-message-row"
      data-direction={storyMessage.direction}
      data-status={storyMessage.status}
      data-show-avatar={showAvatar ? "true" : "false"}
      data-show-name={showName ? "true" : "false"}
      aria-label={storyMessage.direction === "incoming" ? "对方发来的消息" : "我方发送的消息"}
    >
      {showAvatar ? (
        <div className="phone-story-avatar" aria-hidden="true">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              onLoad={reportAvatarLoaded}
              onError={tryNextAvatar}
            />
          ) : (
            firstGlyph(characterName)
          )}
        </div>
      ) : null}
      <div className="phone-story-message-body">
        <div className="phone-story-message-content">
          <span className="phone-story-status" role="status">
            <MessageStatusIndicator status={storyMessage.status} />
          </span>
          <div className="phone-story-bubble" style={bubbleStyle}>
            {showName ? <strong style={nameStyle}>{characterName}</strong> : null}
            <p style={bodyStyle}>{storyMessage.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
