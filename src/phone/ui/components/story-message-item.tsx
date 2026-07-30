import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";
import type { PhoneStoryMessage } from "../../extension/phone-extension";
import { firstGlyph, resolveAssetUrl } from "../asset-utils";

/**
 * 渲染一条手机剧情消息，并实时订阅 Studio 角色资料。
 *
 * 头像候选顺序为：消息指定的角色立绘、角色默认头像、角色第一张立绘。
 * 任一图片加载失败会自动尝试下一候选；全部失败时显示角色名首字，保证坏素材不会留下破损图片图标。
 * `portraitId` 不匹配角色立绘时不会阻塞消息渲染，而是按默认头像策略回退。
 */
export const PhoneStoryMessageItem: React.FC<{ storyMessage: PhoneStoryMessage }> = ({
  storyMessage,
}) => {
  const ctx = useExtensionContext();
  const character = ctx.character.useCharacter(storyMessage.characterId);
  const characterName = (character?.name ?? storyMessage.characterId) || "未知角色";
  const selectedPortrait = character?.portraits?.find(
    (portrait) => portrait.id === storyMessage.portraitId,
  );
  const avatarUrls = useMemo(() => [...new Set(
    [selectedPortrait?.uri, character?.avatarUri, character?.portraits?.[0]?.uri]
      .map((source) => resolveAssetUrl(ctx, source))
      .filter((url): url is string => Boolean(url)),
  )], [character?.avatarUri, character?.portraits, ctx, selectedPortrait?.uri]);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const avatarUrl = avatarUrls[avatarIndex];

  useEffect(() => setAvatarIndex(0), [avatarUrls]);

  const tryNextAvatar = useCallback(() => {
    setAvatarIndex((current) => (
      current + 1 < avatarUrls.length ? current + 1 : avatarUrls.length
    ));
  }, [avatarUrls.length]);

  return (
    <div
      className="phone-story-message-row"
      data-direction={storyMessage.direction}
      aria-label={storyMessage.direction === "incoming" ? "对方发来的消息" : "我方发送的消息"}
    >
      <div className="phone-story-avatar" aria-hidden="true">
        {avatarUrl ? <img src={avatarUrl} alt="" onError={tryNextAvatar} /> : firstGlyph(characterName)}
      </div>
      <div className="phone-story-bubble">
        <strong>{characterName}</strong>
        <p>{storyMessage.message}</p>
      </div>
    </div>
  );
};
