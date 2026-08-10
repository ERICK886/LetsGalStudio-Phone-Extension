/**
 * @file StatusLabel.tsx
 * @description 我方消息状态文案 / 图标（对齐宿主消息手机语义）。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import React from "react";
import type { ChatMessageStatus } from "../../types/index";

/**
 * 渲染消息状态。
 *
 * @param props.status - 状态枚举
 * @returns React 节点；incoming 不显示时可返回 null
 */
export function StatusLabel(props: { status: ChatMessageStatus }) {
  const { status } = props;
  if (status === "sending") {
    return (
      <span className="chat-status" aria-label="发送中">
        发送中…
      </span>
    );
  }
  if (status === "failed" || status === "blocked") {
    return (
      <span className="chat-status" data-error="true">
        {status === "blocked" ? "已被拉黑" : "发送失败"}
      </span>
    );
  }
  if (status === "unread") {
    return <span className="chat-status">未读</span>;
  }
  if (status === "read") {
    return <span className="chat-status">已读</span>;
  }
  return null;
}
