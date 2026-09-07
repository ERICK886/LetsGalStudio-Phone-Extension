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
  directConversationId,
  parseConversationId,
} from "../../domain/conversations";
import {
  listVisibleFriendIds,
  markConversationOpened,
  setOpenConversationId,
  subscribeChatBus,
  readChatState,
  type ChatBusEvent,
} from "../../runtime/index";
import {
  clearPhoneNavigatePending,
  subscribePhoneNavigate,
} from "@ink-zenly/phone-sdk/plugin";

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
  const animationTimersRef = useRef<Set<number>>(new Set());

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  const openConversation = useCallback((conversationId: string) => {
    if (!parseConversationId(conversationId)) return;
    setScreen({ kind: "chat", conversationId });
  }, []);

  const openChat = useCallback(
    (friendCharacterId: string) => {
      openConversation(directConversationId(friendCharacterId));
    },
    [openConversation],
  );

  const openFriendDetail = useCallback((friendCharacterId: string) => {
    setScreen({ kind: "friend-detail", friendCharacterId });
  }, []);

  const goTabs = useCallback((tab: ChatTab) => {
    setScreen({ kind: "tabs", tab });
  }, []);

  // 深链：宿主 openPhoneApp({ appId: "phone-chat", payload: { friendCharacterId } }) 后，
  // 导航总线会发布/回放最新请求；消费后立即清理，避免下次手动打开时回放旧深链。
  useEffect(() => {
    return subscribePhoneNavigate((req) => {
      if (req.appId !== PROGRAM_ID) return;
      const payload = req.payload as
        | { conversationId?: unknown; friendCharacterId?: unknown }
        | undefined;
      const explicitConversationId =
        typeof payload?.conversationId === "string"
          ? payload.conversationId.trim()
          : "";
      if (parseConversationId(explicitConversationId)) {
        openConversation(explicitConversationId);
        clearPhoneNavigatePending();
        return;
      }
      const friendId =
        typeof payload?.friendCharacterId === "string"
          ? payload.friendCharacterId.trim()
          : "";
      if (friendId) openChat(friendId);
      clearPhoneNavigatePending();
    });
  }, [openChat, openConversation]);

  useEffect(() => {
    return () => {
      // 返回桌面 / 关闭手机不能解除「必须回复」；只在扩展真正卸载时释放等待。
      setOpenConversationId(null);
    };
  }, []);

  useEffect(() => {
    return subscribeChatBus((event: ChatBusEvent) => {
      if (event.type === "messages-appended") {
        if (
          screen.kind === "chat" &&
          screen.conversationId === event.conversationId
        ) {
          setAnimatingIds((prev) => {
            const next = new Set(prev);
            for (const message of event.messages) next.add(message.id);
            return next;
          });
          const timer = window.setTimeout(() => {
            setAnimatingIds((prev) => {
              const next = new Set(prev);
              for (const message of event.messages) next.delete(message.id);
              return next;
            });
            animationTimersRef.current.delete(timer);
          }, 280);
          animationTimersRef.current.add(timer);
        }
      }
      refresh();
    });
  }, [refresh, screen]);

  useEffect(() => {
    const timers = animationTimersRef.current;
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (screen.kind === "chat") {
      setOpenConversationId(screen.conversationId);
      markConversationOpened(screen.conversationId);
      refresh();
      return () => {
        setOpenConversationId(null);
      };
    }
    setOpenConversationId(null);
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
    openConversation,
    openFriendDetail,
    goTabs,
  };
}
