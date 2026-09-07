/**
 * @file MessageBubble.tsx
 * @description 单聊 / 群聊消息气泡与发送者身份。
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React, { useEffect, useState } from "react";

import { resolveAssetUrl } from "../../domain/character";
import type { ChatMessage } from "../../types/index";
import { useCharacterView } from "../hooks/useCharacterView";
import { useSelfCharacterView } from "../hooks/useSelfCharacterView";
import { Avatar } from "./Avatar";
import { StatusLabel } from "./StatusLabel";

export interface MessageBubbleProps {
  message: ChatMessage;
  /** 单聊对方；群聊消息优先使用 message.senderCharacterId。 */
  peerCharacterId?: string;
  showSenderName?: boolean;
  animate?: boolean;
}

function BubbleContent({ message }: { message: ChatMessage }) {
  const ctx = useExtensionContext();
  const isImage = message.contentType === "image";
  const imageUrl = isImage ? resolveAssetUrl(ctx, message.imageAsset) : undefined;
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  useEffect(() => setImageLoadFailed(false), [imageUrl]);

  return (
    <div className="chat-bubble">
      {isImage ? (
        imageLoadFailed || !imageUrl ? (
          "图片加载失败"
        ) : (
          <img
            className="chat-bubble-img"
            src={imageUrl}
            alt=""
            onError={() => setImageLoadFailed(true)}
          />
        )
      ) : (
        message.text
      )}
    </div>
  );
}

function OutgoingMessage(props: MessageBubbleProps) {
  const ctx = useExtensionContext();
  const self = useSelfCharacterView(ctx);
  return (
    <div
      className="chat-msg"
      data-direction="outgoing"
      data-animate={props.animate ? "true" : "false"}
    >
      <Avatar url={self.avatarUrl} glyph={self.glyph} />
      <div className="chat-msg-col">
        <BubbleContent message={props.message} />
        <StatusLabel status={props.message.status} />
      </div>
    </div>
  );
}

function IncomingMessage(props: MessageBubbleProps & { characterId: string }) {
  const ctx = useExtensionContext();
  const sender = useCharacterView(ctx, props.characterId);
  return (
    <div
      className="chat-msg"
      data-direction="incoming"
      data-animate={props.animate ? "true" : "false"}
    >
      <Avatar url={sender.avatarUrl} glyph={sender.glyph} />
      <div className="chat-msg-col">
        {props.showSenderName ? (
          <div className="chat-msg-sender">{sender.name}</div>
        ) : null}
        <BubbleContent message={props.message} />
      </div>
    </div>
  );
}

export function MessageBubble(props: MessageBubbleProps) {
  if (props.message.direction === "outgoing") {
    return <OutgoingMessage {...props} />;
  }
  const characterId =
    props.message.senderCharacterId?.trim() || props.peerCharacterId?.trim() || "";
  if (!characterId) return null;
  return <IncomingMessage {...props} characterId={characterId} />;
}
