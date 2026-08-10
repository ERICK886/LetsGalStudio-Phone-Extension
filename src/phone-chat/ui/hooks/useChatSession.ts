/**
 * @file useChatSession.ts
 * @description 订阅 store / bus，提供会话快照、导航与入场动画 ID。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ChatScreen, ChatTab } from "../../types/index";
import { PROGRAM_ID } from "../../constants";
import {
  listVisibleFriendIds,
  markChatOpened,
  resolveReplyWaitsForFriend,
  setOpenChatFriendId,
  subscribeChatBus,
  readChatState,
  type ChatBusEvent,
} from "../../runtime/index";
import { subscribePhoneNavigate } from "@ink-zenly/phone-sdk/plugin";

/** 已消费的最新 navigate seq；用于抑制导航总线的旧 pending 回放。 */
let lastConsumedNavigateSeq = 0;

/**
 * 内页会话会话状态与导航。
 *
 * @returns screen / state / friendIds / animatingIds / logRef / 导航回调 / refresh
 *
 * @example
 * ```tsx
 * const session = useChatSession();
 * ```
 */
export function useChatSession() {
  const [screen, setScreen] = useState<ChatScreen>({
    kind: "tabs",
    tab: "chats",
  });
  const [tick, setTick] = useState(0);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const logRef = useRef<HTMLDivElement>(null!);

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  const openChat = useCallback((friendCharacterId: string) => {
    setScreen({ kind: "chat", friendCharacterId });
  }, []);

  const openFriendDetail = useCallback((friendCharacterId: string) => {
    setScreen({ kind: "friend-detail", friendCharacterId });
  }, []);

  const goTabs = useCallback((tab: ChatTab) => {
    setScreen({ kind: "tabs", tab });
  }, []);

  // 深链：宿主 openPhoneApp({ appId: "phone-chat", payload: { friendCharacterId } }) 后，
  // 导航总线会发布/回放最新一条 navigate 请求。仅处理本应用且 seq 新于已消费的请求，
  // 避免手动从桌面打开聊天时被旧 pending 反复拉进某会话。
  useEffect(() => {
    return subscribePhoneNavigate((req) => {
      if (req.appId !== PROGRAM_ID) return;
      if (req.seq <= lastConsumedNavigateSeq) return;
      lastConsumedNavigateSeq = req.seq;
      const payload = req.payload as { friendCharacterId?: unknown } | undefined;
      const friendId =
        typeof payload?.friendCharacterId === "string"
          ? payload.friendCharacterId.trim()
          : "";
      if (friendId) openChat(friendId);
    });
  }, [openChat]);

  useEffect(() => {
    return () => {
      resolveReplyWaitsForFriend();
      setOpenChatFriendId(null);
    };
  }, []);

  useEffect(() => {
    return subscribeChatBus((event: ChatBusEvent) => {
      if (event.type === "messages-appended") {
        if (
          screen.kind === "chat" &&
          screen.friendCharacterId === event.friendCharacterId
        ) {
          setAnimatingIds((prev) => {
            const next = new Set(prev);
            for (const message of event.messages) next.add(message.id);
            return next;
          });
          window.setTimeout(() => {
            setAnimatingIds((prev) => {
              const next = new Set(prev);
              for (const message of event.messages) next.delete(message.id);
              return next;
            });
          }, 280);
        }
      }
      refresh();
    });
  }, [refresh, screen]);

  useEffect(() => {
    if (screen.kind === "chat") {
      setOpenChatFriendId(screen.friendCharacterId);
      markChatOpened(screen.friendCharacterId);
      refresh();
      return () => {
        setOpenChatFriendId(null);
      };
    }
    setOpenChatFriendId(null);
    return undefined;
  }, [screen, refresh]);

  useEffect(() => {
    if (screen.kind !== "chat") return;
    const el = logRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [screen, tick, animatingIds]);

  const state = useMemo(() => readChatState(), [tick]);
  const friendIds = useMemo(() => listVisibleFriendIds(), [tick]);

  return {
    screen,
    state,
    friendIds,
    animatingIds,
    logRef,
    refresh,
    openChat,
    openFriendDetail,
    goTabs,
  };
}
