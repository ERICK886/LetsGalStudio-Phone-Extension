/**
 * @file HomeTabsScreen.tsx
 * @description 首页：聊天列表 / 好友列表 + 底部 Tab。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.1
 */

import React from "react";

import type { ChatAuthorSettings } from "../../runtime/settings";
import type { ChatTab, ChatThread } from "../../types/index";
import {
  AppHeader,
  ChatThreadRow,
  EmptyHint,
  FriendListRow,
  TabIconChat,
  TabIconFriends,
} from "../components/index";

export interface HomeTabsScreenProps {
  /** 当前选中的底部 Tab */
  tab: ChatTab;
  /** 作者配置（标题、Tab 文案等） */
  settings: ChatAuthorSettings;
  /** 全部会话线程 */
  threads: ChatThread[];
  /** 好友角色 ID 列表 */
  friendIds: string[];
  /**
   * 底部安全区高度（px），由 TabBar 背景吸收。
   * 父级根容器应使用 `includeBottom: false` 的 safe-area padding，
   * 并将 `safeAreaInsets.bottom` 传入此 prop，使 TabBar 背景贴齐屏幕底边。
   */
  bottomInset: number;
  /** 关闭内页应用 */
  onCloseApp: () => void;
  /** 切换底部 Tab */
  onChangeTab: (tab: ChatTab) => void;
  /** 打开与指定好友的聊天页 */
  onOpenChat: (friendCharacterId: string) => void;
  /** 打开指定好友详情页 */
  onOpenFriendDetail: (friendCharacterId: string) => void;
}

/**
 * @param props - HomeTabsScreenProps
 * @returns 首页节点
 */
export function HomeTabsScreen(props: HomeTabsScreenProps) {
  const visibleThreads = props.threads.filter((thread) =>
    props.friendIds.includes(thread.friendCharacterId),
  );

  return (
    <>
      <AppHeader title={props.settings.appTitle} onBack={props.onCloseApp} />

      <div className="chat-body">
        {props.tab === "chats" ? (
          visibleThreads.length === 0 ? (
            <EmptyHint text={props.settings.emptyChatsHint} />
          ) : (
            <div>
              {visibleThreads.map((thread) => (
                <ChatThreadRow
                  key={thread.friendCharacterId}
                  thread={thread}
                  onOpen={props.onOpenChat}
                />
              ))}
            </div>
          )
        ) : props.friendIds.length === 0 ? (
          <EmptyHint text={props.settings.emptyFriendsHint} />
        ) : (
          <div>
            {props.friendIds.map((id) => (
              <FriendListRow
                key={id}
                friendCharacterId={id}
                onOpen={props.onOpenFriendDetail}
              />
            ))}
          </div>
        )}
      </div>

      <nav
        className="chat-tabs"
        style={{ paddingBottom: props.bottomInset }}
      >
        <button
          type="button"
          className="chat-tab"
          data-active={props.tab === "chats"}
          onClick={() => props.onChangeTab("chats")}
        >
          <TabIconChat />
          <span>{props.settings.chatsTabLabel}</span>
        </button>
        <button
          type="button"
          className="chat-tab"
          data-active={props.tab === "friends"}
          onClick={() => props.onChangeTab("friends")}
        >
          <TabIconFriends />
          <span>{props.settings.friendsTabLabel}</span>
        </button>
      </nav>
    </>
  );
}
