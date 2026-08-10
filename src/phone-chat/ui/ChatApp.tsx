/**
 * @file ChatApp.tsx
 * @description 聊天内页根：注入样式、会话 hook、按 screen 路由到各页面。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.1
 */

import { useExtensionContext } from "@avg-studio/sdk";
import type { PhoneAppRenderProps } from "@ink-zenly/phone-sdk/plugin";
import React, { useEffect } from "react";

import { selectPlayerReply } from "../runtime/actions";
import { syncChatDesktopBadge } from "../runtime/desktop-badge";
import { getCachedAuthorSettings } from "../runtime/settings";
import { useChatSession } from "./hooks/useChatSession";
import { useSafeAreaStyle } from "./hooks/useSafeAreaStyle";
import {
  FriendDetailScreen,
  HomeTabsScreen,
  ThreadScreen,
} from "./screens/index";
import { ensureChatStyles } from "./styles/inject-styles";

/**
 * Phone SDK 内页根组件。
 *
 * @param props - PhoneAppRenderProps
 * @returns 嵌在手机屏幕内的 React 节点
 *
 * @remarks
 * - 存档经 runtime store；本组件用宿主 context 读角色与变量。
 * - 页面逻辑在 `screens/`，可复用零件在 `components/`。
 *
 * @example
 * ```tsx
 * render: (props) => <ChatApp {...props} />
 * ```
 */
export function ChatApp(props: PhoneAppRenderProps) {
  ensureChatStyles();

  const { closeApp, safeAreaInsets } = props;
  const ctx = useExtensionContext();
  const settings = getCachedAuthorSettings();

  // hooks 规则：无条件在组件顶部同时计算两种 padding
  const fullPaddingStyle = useSafeAreaStyle(safeAreaInsets);
  const homePaddingStyle = useSafeAreaStyle(safeAreaInsets, {
    includeBottom: false,
  });

  const session = useChatSession();

  // 宿主打开内页会先 clear 桌面角标；若仍有未读则立刻再 set。
  useEffect(() => {
    syncChatDesktopBadge();
  }, []);

  const { screen, state, friendIds, animatingIds, logRef } = session;

  if (screen.kind === "chat") {
    const thread = state.threads.find(
      (item) => item.friendCharacterId === screen.friendCharacterId,
    );
    const pending =
      state.pendingReplies?.friendCharacterId === screen.friendCharacterId
        ? state.pendingReplies
        : null;

    return (
      <div className="chat-root" style={fullPaddingStyle}>
        <ThreadScreen
          friendCharacterId={screen.friendCharacterId}
          thread={thread}
          animatingIds={animatingIds}
          replyOptions={pending?.options ?? []}
          logRef={logRef}
          onBack={() => session.goTabs("chats")}
          onSelectReply={(replyId) => {
            selectPlayerReply(ctx, replyId);
            session.refresh();
          }}
        />
      </div>
    );
  }

  if (screen.kind === "friend-detail") {
    return (
      <div className="chat-root" style={fullPaddingStyle}>
        <FriendDetailScreen
          friendCharacterId={screen.friendCharacterId}
          onBack={() => session.goTabs("friends")}
          onOpenChat={() => session.openChat(screen.friendCharacterId)}
        />
      </div>
    );
  }

  return (
    <div className="chat-root" style={homePaddingStyle}>
      <HomeTabsScreen
        tab={screen.tab}
        settings={settings}
        threads={state.threads}
        friendIds={friendIds}
        bottomInset={safeAreaInsets.bottom}
        onCloseApp={closeApp}
        onChangeTab={session.goTabs}
        onOpenChat={session.openChat}
        onOpenFriendDetail={session.openFriendDetail}
      />
    </div>
  );
}
