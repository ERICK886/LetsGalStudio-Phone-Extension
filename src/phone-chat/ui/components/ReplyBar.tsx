/**
 * @file ReplyBar.tsx
 * @description 底部可选回复按钮组。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { useExtensionContext } from "@avg-studio/sdk";
import React, { useEffect, useState } from "react";

import { resolveAssetUrl } from "../../domain/character";

export interface ReplyBarOption {
  id: string;
  text: string;
  contentType?: "text" | "image";
  imageAsset?: string;
}

export interface ReplyBarProps {
  options: readonly ReplyBarOption[];
  onSelect: (replyId: string) => void;
}

/**
 * @param props - ReplyBarProps
 * @returns 回复栏；无选项时返回 null
 */
function ReplyOptionButton(props: {
  option: ReplyBarOption;
  onSelect: (replyId: string) => void;
}) {
  const ctx = useExtensionContext();
  const isImage = props.option.contentType === "image";
  const thumbUrl = isImage
    ? resolveAssetUrl(ctx, props.option.imageAsset)
    : undefined;
  const [thumbLoadFailed, setThumbLoadFailed] = useState(false);

  useEffect(() => setThumbLoadFailed(false), [thumbUrl]);

  return (
    <button
      type="button"
      className="chat-reply-btn"
      data-content-type={isImage ? "image" : "text"}
      onClick={() => props.onSelect(props.option.id)}
    >
      {isImage ? (
        thumbLoadFailed || !thumbUrl ? (
          "[图片]"
        ) : (
          <img
            className="chat-reply-thumb"
            src={thumbUrl}
            alt=""
            onError={() => setThumbLoadFailed(true)}
          />
        )
      ) : (
        props.option.text
      )}
    </button>
  );
}

export function ReplyBar(props: ReplyBarProps) {
  if (props.options.length === 0) return null;

  return (
    <div className="chat-replies">
      {props.options.map((option) => (
        <ReplyOptionButton
          key={option.id}
          option={option}
          onSelect={props.onSelect}
        />
      ))}
    </div>
  );
}
