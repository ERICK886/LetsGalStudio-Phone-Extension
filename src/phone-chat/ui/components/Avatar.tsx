/**
 * @file Avatar.tsx
 * @description 好友头像（图或首字占位）。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import React, { useState } from "react";

export interface AvatarProps {
  /** 已解析的图片 URL */
  url?: string;
  /** 无图时的占位字 */
  glyph: string;
  /** 额外 class */
  className?: string;
}

/**
 * 圆形/方圆头像。
 *
 * @param props - AvatarProps
 * @returns React 节点
 */
export function Avatar(props: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(props.url) && !failed;

  return (
    <div className={props.className ?? "chat-avatar"} aria-hidden={!showImg}>
      {showImg ? (
        <img
          src={props.url}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        props.glyph
      )}
    </div>
  );
}
