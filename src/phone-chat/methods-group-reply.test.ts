import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { ExtensionContext, SaveAPI } from "@avg-studio/sdk";
import {
  PHONE_SDK_GLOBAL_KEY,
  getPhoneSdkSlot,
  isPhoneCloseLocked,
} from "@ink-zenly/phone-sdk/plugin";

import { groupConversationId } from "./domain/conversations.ts";
import { executeGroupMemberMessage } from "./runtime/group-message-reply.ts";
import { bindChatSave, readChatState } from "./runtime/store.ts";
import { selectPlayerReply } from "./runtime/actions.ts";
import { cacheAuthorSettings } from "./runtime/settings.ts";

function createSave(): SaveAPI<Record<string, unknown>> {
  const values = new Map<string, unknown>();
  return {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => values.set(key, value),
    useValue: (() => {
      throw new Error("not used in this test");
    }) as SaveAPI<Record<string, unknown>>["useValue"],
  } as SaveAPI<Record<string, unknown>>;
}

function createContext(signal: AbortSignal): ExtensionContext {
  return {
    settings: {
      get: (key: string) =>
        key === "defaultGroups"
          ? [{ id: "club", title: "社团群", memberCharacterIds: ["alice"] }]
          : undefined,
    },
    flow: { signal },
  } as unknown as ExtensionContext;
}

describe("group member message replies", () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[PHONE_SDK_GLOBAL_KEY];
  });

  it("locks the phone until the required attached reply is selected", async () => {
    const navigationCalls: unknown[] = [];
    getPhoneSdkSlot().navigation = {
      async openPhoneApp(options) {
        navigationCalls.push(options);
        return "opened";
      },
      async closePhoneApp() {},
    };
    const controller = new AbortController();
    const ctx = createContext(controller.signal);
    const save = createSave();
    bindChatSave(save);
    cacheAuthorSettings({
      selfCharacterId: "",
      defaultFriends: [],
      defaultGroups: [
        {
          id: "club",
          title: "社团群",
          avatarAsset: "",
          memberCharacterIds: ["alice"],
        },
      ],
      attributeFields: [],
      chatsTabLabel: "聊天",
      friendsTabLabel: "好友",
      emptyChatsHint: "暂无聊天",
      emptyFriendsHint: "暂无好友",
      appTitle: "聊天",
    });

    const running = executeGroupMemberMessage(
      ctx,
      {
        groupId: "club",
        sender: "alice",
        message: "你来吗？",
        reply1: "我会去",
        requireReply: true,
        openPhone: false,
        outgoingStatus: "read",
        closePhoneAfter: false,
        waitUntilClose: false,
      },
      true,
      { openPhoneApp: true },
    );
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));

    const waitingState = readChatState();
    const conversationId = groupConversationId("club");
    const pending = waitingState.pendingReplies.find(
      (item) => item.conversationId === conversationId,
    );
    assert.ok(pending);
    assert.equal(isPhoneCloseLocked(), true);
    assert.deepEqual(navigationCalls, [
      {
        appId: "phone-chat",
        waitUntil: "none",
        payload: { conversationId },
      },
    ]);

    assert.equal(selectPlayerReply(ctx, pending.options[0]!.id, conversationId), true);
    await running;
    assert.equal(isPhoneCloseLocked(), false);

    const messages = readChatState().threads[0]!.messages;
    assert.equal(messages[0]!.senderCharacterId, "alice");
    assert.equal(messages[0]!.direction, "incoming");
    assert.equal(messages[1]!.text, "我会去");
    assert.equal(messages[1]!.direction, "outgoing");
  });

});
