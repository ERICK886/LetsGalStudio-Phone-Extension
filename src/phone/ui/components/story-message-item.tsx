import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useExtensionContext } from "@avg-studio/sdk";
import type { PhoneStoryMessage } from "../../extension/phone-extension";
import { firstGlyph, resolveAssetUrl } from "../asset-utils";

/**
 * 渲染一条手机剧情消息，并实时订阅 Studio 角色资料。
 *
 * 头像候选顺序为：消息指定的角色立绘、角色默认头像、角色第一张立绘。
 * 立绘选择器的正常值是稳定 ID；为兼容 Studio 版本把唯一立绘显示名或 URI 写入参数的情况，
 * 也接受与当前角色立绘的精确匹配。任一图片加载失败会自动尝试下一候选；全部失败时显示角色名首字。
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

    // 稳定 ID 是首选契约；URI 与唯一显示名仅用于兼容不同 Studio 选择器实现。
    const idMatch = portraits.find((portrait) => portrait.id === portraitRef);
    if (idMatch) return idMatch;
    const uriMatch = portraits.find((portrait) => portrait.uri === portraitRef);
    if (uriMatch) return uriMatch;
    const normalizedRef = portraitRef.trim().normalize("NFC");
    const nameMatches = portraits.filter(
      (portrait) => portrait.name?.trim().normalize("NFC") === normalizedRef,
    );
    return nameMatches.length === 1 ? nameMatches[0] : undefined;
  }, [character?.portraits, storyMessage.portraitId]);
  const avatarCandidates = useMemo(() => {
    const candidateUris = [
      { source: "selected-portrait", uri: selectedPortrait?.uri },
      { source: "character-avatar", uri: character?.avatarUri },
      { source: "first-portrait", uri: character?.portraits?.[0]?.uri },
    ] as const;
    const seenUrls = new Set<string>();
    return candidateUris.flatMap((candidate) => {
      const url = resolveAssetUrl(ctx, candidate.uri);
      if (!url || seenUrls.has(url)) return [];
      seenUrls.add(url);
      return [{ source: candidate.source, uri: candidate.uri, url }];
    });
  }, [character?.avatarUri, character?.portraits, ctx, selectedPortrait?.uri]);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const avatarUrl = avatarCandidates[avatarIndex]?.url;
  const avatarDiagnosticRef = React.useRef<string>();

  useEffect(() => setAvatarIndex(0), [avatarCandidates]);

  useEffect(() => {
    if (!storyMessage.portraitId && avatarCandidates.length > 0) return;
    const diagnosticKey = [
      storyMessage.characterId,
      storyMessage.portraitId ?? "",
      selectedPortrait?.id ?? "",
      character?.portraits?.length ?? 0,
      avatarCandidates.map((candidate) => candidate.source).join(","),
    ].join("|");
    if (avatarDiagnosticRef.current === diagnosticKey) return;
    avatarDiagnosticRef.current = diagnosticKey;
    console.log("[phone-avatar] resolution", {
      characterId: storyMessage.characterId,
      portraitRef: storyMessage.portraitId,
      portraitCount: character?.portraits?.length ?? 0,
      selectedPortrait: selectedPortrait
        ? { id: selectedPortrait.id, name: selectedPortrait.name, hasUri: Boolean(selectedPortrait.uri) }
        : null,
      hasCharacterAvatar: Boolean(character?.avatarUri),
      candidates: avatarCandidates.map((candidate) => ({
        source: candidate.source,
        rawUri: candidate.uri,
        resolvedUrl: candidate.url,
      })),
    });
  }, [avatarCandidates, character?.avatarUri, character?.portraits?.length, selectedPortrait, storyMessage.characterId, storyMessage.portraitId]);

  const reportAvatarLoaded = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const loadedCandidate = avatarCandidates[avatarIndex];
    console.log("[phone-avatar] image-load-succeeded", {
      characterId: storyMessage.characterId,
      portraitRef: storyMessage.portraitId,
      candidateSource: loadedCandidate?.source,
      candidateIndex: avatarIndex,
      rawUri: loadedCandidate?.uri,
      resolvedUrl: loadedCandidate?.url,
      imageCurrentSrc: image.currentSrc,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    });
  }, [avatarCandidates, avatarIndex, storyMessage.characterId, storyMessage.portraitId]);

  const tryNextAvatar = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const failedImage = {
      currentSrc: image.currentSrc,
      src: image.src,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
    setAvatarIndex((current) => {
      const failedCandidate = avatarCandidates[current];
      console.warn("[phone-avatar] image-load-failed", {
        characterId: storyMessage.characterId,
        portraitRef: storyMessage.portraitId,
        candidateSource: failedCandidate?.source,
        candidateIndex: current,
        candidateCount: avatarCandidates.length,
        rawUri: failedCandidate?.uri,
        resolvedUrl: failedCandidate?.url,
        image: failedImage,
      });
      return current + 1 < avatarCandidates.length ? current + 1 : avatarCandidates.length;
    });
  }, [avatarCandidates, storyMessage.characterId, storyMessage.portraitId]);

  return (
    <div
      className="phone-story-message-row"
      data-direction={storyMessage.direction}
      aria-label={storyMessage.direction === "incoming" ? "对方发来的消息" : "我方发送的消息"}
    >
      <div className="phone-story-avatar" aria-hidden="true">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" onLoad={reportAvatarLoaded} onError={tryNextAvatar} />
        ) : firstGlyph(characterName)}
      </div>
      <div className="phone-story-bubble">
        <strong>{characterName}</strong>
        <p>{storyMessage.message}</p>
      </div>
    </div>
  );
};
