/**
 * @file methods.ts
 * @description 聊天内页单聊、群聊与好友管理 Studio 方法，供 `ChatController`
 *              类体上以静态属性赋值挂载。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 *
 * @remarks
 * - 导出已构造好的 `method()` 结果（`BrandedExtensionMethod`）。
 * - `run` / `runImmediately` / `skip` 里的 `this` 是本模块 `ChatController` 实例，
 *   `this.save` 为本模块独立存档（无前缀键名）。
 * - 每个执行体先调用 `bindChatSave(this.save)`。
 */

import {
  type ExtensionContext,
  method,
} from "@avg-studio/sdk";

import {
  buildFriendMessageSchemaFields,
  buildReplySchemaFields,
  coerceMethodBoolean,
  normalizeOutgoingStatus,
  parseFriendMessagesFromParams,
  parseRepliesFromParams,
} from "./domain/index";
import {
  addFriend,
  awaitGroupReply,
  awaitPlayerReply,
  bindChatSave,
  cacheAuthorSettings,
  closeChatPhoneAppAfter,
  executeGroupMemberMessage,
  joinGroupMember,
  leaveGroupMember,
  openChatPhoneApp,
  openGroupChatPhoneApp,
  readAuthorSettings,
  removeFriend,
  sendFriendMessages,
} from "./runtime/index";

/**
 * 绑定 save 并刷新作者设置缓存。
 *
 * @param instanceSave - 本模块实例 this.save
 * @param ctx - 扩展上下文
 */
function prepareRuntime(instanceSave: unknown, ctx: ExtensionContext): void {
  bindChatSave(instanceSave as Parameters<typeof bindChatSave>[0]);
  cacheAuthorSettings(readAuthorSettings(ctx));
}

/**
 * 执行「对方发送消息」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数（含 `friend` 与 `message` 槽位，及 `openPhone` / `waitUntilClose`）
 * @param instanceSave - 包装类实例 this.save
 * @param options.openPhoneApp - 是否在写入消息后打开手机内页；
 *   仅 `run` 路径置 true，`runImmediately` / `skip` 置 false
 * @returns Promise<void>
 *
 * @remarks
 * 提取为模块级辅助函数，避免 `runImmediately` / `skip` 在静态属性初始化器中
 * 自引用 `chatSendFriendMessagesMethod.run`，从而触发 TS7022/TS7023。
 */
async function executeSendFriendMessages(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
  options: { openPhoneApp: boolean },
): Promise<void> {
  prepareRuntime(instanceSave, ctx);
  const friendCharacterId = String(params.friend ?? "");
  const messages = parseFriendMessagesFromParams(params);
  if (!friendCharacterId.trim() || messages.length === 0) return;
  await sendFriendMessages({
    friendCharacterId,
    messages,
  });

  // schema 默认打开；仅当明确为 false（含字符串 "false"）时跳过。
  // 未打开时绝不能 waitUntilClose，否则会卡在等待关手机。
  const shouldOpen =
    options.openPhoneApp && coerceMethodBoolean(params.openPhone, true);
  if (!shouldOpen) return;

  const waitUntilClose = coerceMethodBoolean(params.waitUntilClose, false);
  await openChatPhoneApp({
    friendCharacterId,
    waitUntil: waitUntilClose ? "close" : "none",
  });
}

async function executeSendGroupMessages(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
  allowWait: boolean,
  options: { openPhoneApp: boolean },
): Promise<void> {
  prepareRuntime(instanceSave, ctx);
  await executeGroupMemberMessage(ctx, params, allowWait, options);
}

/**
 * 执行「等待玩家回复」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数（含 `friend`、`reply` 槽位、`requireReply`、`openPhone` 等）
 * @param instanceSave - 包装类实例 this.save
 * @param allowWait - true 时按 `requireReply` 决定挂起或仅写入；false 时自动点选第一条（快进/skip）
 * @param options.openPhoneApp - 运行路径是否允许打开手机（`run` 为 true）
 * @returns Promise<void>
 *
 * @remarks
 * - **必须回复**（默认）：打开手机并深开该好友会话，挂起至玩家点选
 * - **非必须**：只写入可选回复，不打开手机、不挂起；玩家稍后打开手机仍可回复
 */
async function executeAwaitPlayerReply(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
  allowWait: boolean,
  options: { openPhoneApp: boolean },
): Promise<void> {
  prepareRuntime(instanceSave, ctx);
  const outgoingStatus = normalizeOutgoingStatus(params.outgoingStatus);
  const friendCharacterId = String(params.friend ?? "");
  const replies = parseRepliesFromParams(params);
  if (!friendCharacterId.trim() || replies.length === 0) return;
  const requireReply = coerceMethodBoolean(params.requireReply, true);
  // 正常 run + 必须回复 → 挂起；非必须 → 只写 pending
  const waitForReply = allowWait && requireReply;
  // 必须回复时强制打开并跳转会话；非必须绝不打开
  const shouldOpenPhone = options.openPhoneApp && waitForReply;

  await awaitPlayerReply(ctx, {
    friendCharacterId,
    replies,
    outgoingStatus,
    allowWait,
    waitForReply,
    onPendingWritten: shouldOpenPhone
      ? () => openChatPhoneApp({ friendCharacterId, waitUntil: "none" })
      : undefined,
  });

  // 仅「必须回复且确实挂起过」时才可能关手机
  if (waitForReply && coerceMethodBoolean(params.closePhoneAfter, false)) {
    const rawDelay = Number(params.closeDelayMs);
    const delayMs =
      Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 1000;
    await closeChatPhoneAppAfter(delayMs);
  }
}

async function executeAwaitGroupReply(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
  allowWait: boolean,
  options: { openPhoneApp: boolean },
): Promise<void> {
  prepareRuntime(instanceSave, ctx);
  const groupId = String(params.groupId ?? "").trim();
  const replies = parseRepliesFromParams(params);
  if (!groupId || replies.length === 0) return;

  const requireReply = coerceMethodBoolean(params.requireReply, true);
  const waitForReply = allowWait && requireReply;
  const shouldOpenPhone = options.openPhoneApp && waitForReply;
  await awaitGroupReply(ctx, {
    groupId,
    replies,
    outgoingStatus: normalizeOutgoingStatus(params.outgoingStatus),
    allowWait,
    waitForReply,
    onPendingWritten: shouldOpenPhone
      ? () => openGroupChatPhoneApp({ groupId, waitUntil: "none" })
      : undefined,
  });

  if (waitForReply && coerceMethodBoolean(params.closePhoneAfter, false)) {
    const rawDelay = Number(params.closeDelayMs);
    const delayMs =
      Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 1000;
    await closeChatPhoneAppAfter(delayMs);
  }
}

/**
 * 「对方发送消息」方法描述。
 *
 * @remarks
 * 方法 ID：`send-friend-messages`。供 `ChatController` 挂载：
 * ```ts
 * static sendFriendMessages = chatSendFriendMessagesMethod;
 * ```
 */
export const chatSendFriendMessagesMethod = method({
  id: "send-friend-messages",
  title: "聊天 · 对方发送消息",
  description:
    "向聊天内页写入对方（左边）多条消息；不附带玩家回复、不挂起。",
  schema: {
    openPhone: {
      type: "boolean",
      label: "打开手机并进入聊天",
      default: true,
    },
    waitUntilClose: {
      type: "boolean",
      label: "等待玩家关闭手机（仅在已打开手机时生效；多句回复请保持关闭）",
      default: false,
    },
    friend: {
      type: "character",
      label: "目标好友",
      required: true,
    },
    ...buildFriendMessageSchemaFields(),
  },
  async run(ctx, params) {
    await executeSendFriendMessages(
      ctx,
      params as Record<string, unknown>,
      this.save,
      { openPhoneApp: true },
    );
  },
  async runImmediately(ctx, params) {
    await executeSendFriendMessages(
      ctx,
      params as Record<string, unknown>,
      this.save,
      { openPhoneApp: false },
    );
  },
  async skip(ctx, params) {
    await executeSendFriendMessages(
      ctx,
      params as Record<string, unknown>,
      this.save,
      { openPhoneApp: false },
    );
  },
});

/**
 * 「等待玩家回复」方法描述。
 *
 * @remarks
 * 方法 ID：`await-player-reply`。
 * - **必须回复**（默认）：打开手机并进入该好友会话，挂起至点选后发出我方消息
 * - **非必须**：只写入可选回复并继续剧情；玩家稍后打开手机仍可点选
 * 多句连续对话请放置多个本方法块。
 */
export const chatAwaitPlayerReplyMethod = method({
  id: "await-player-reply",
  title: "聊天 · 玩家回复一句",
  description:
    "配置本句玩家可选回复（多选一）。必须回复时打开手机并挂起；非必须时写入选项后继续剧情，稍后打开手机仍可回复。",
  schema: {
    requireReply: {
      type: "boolean",
      label: "必须回复（关闭则不打开手机、不卡住剧情）",
      default: true,
    },
    outgoingStatus: {
      type: "enum",
      label: "我方消息状态",
      default: "read",
      options: [
        { label: "发送中", value: "sending" },
        { label: "未读", value: "unread" },
        { label: "已读", value: "read" },
        { label: "失败", value: "failed" },
        { label: "被拉黑", value: "blocked" },
      ],
    },
    closePhoneAfter: {
      type: "boolean",
      label: "回复后关闭手机（仅必须回复时生效；多句时只勾最后一句）",
      default: false,
    },
    closeDelayMs: {
      type: "number",
      label: "关闭延迟（毫秒）",
      default: 1000,
      min: 0,
      max: 60_000,
      step: 100,
    },
    friend: {
      type: "character",
      label: "目标好友",
      required: true,
    },
    ...buildReplySchemaFields(),
  },
  async run(ctx, params) {
    await executeAwaitPlayerReply(
      ctx,
      params as Record<string, unknown>,
      this.save,
      true,
      { openPhoneApp: true },
    );
  },
  async runImmediately(ctx, params) {
    await executeAwaitPlayerReply(
      ctx,
      params as Record<string, unknown>,
      this.save,
      false,
      { openPhoneApp: false },
    );
  },
  async skip(ctx, params) {
    await executeAwaitPlayerReply(
      ctx,
      params as Record<string, unknown>,
      this.save,
      false,
      { openPhoneApp: false },
    );
  },
});

/** 向群聊写入指定成员发送的多条消息，并可在同一方法中配置玩家回复。 */
export const chatSendGroupMessagesMethod = method({
  id: "send-group-messages",
  title: "聊天 · 群成员发送消息",
  description:
    "向指定群聊写入成员消息，并可附带玩家回复选项；必须回复时强制打开群聊、锁定手机并挂起剧情。",
  schema: {
    openPhone: {
      type: "boolean",
      label: "打开手机并进入群聊",
      default: true,
    },
    waitUntilClose: {
      type: "boolean",
      label: "等待玩家关闭手机（回复后自动关闭时忽略）",
      default: false,
    },
    requireReply: {
      type: "boolean",
      label: "有回复选项时必须回复",
      default: true,
    },
    outgoingStatus: {
      type: "enum",
      label: "我方回复消息状态",
      default: "read",
      options: [
        { label: "发送中", value: "sending" },
        { label: "未读", value: "unread" },
        { label: "已读", value: "read" },
        { label: "失败", value: "failed" },
        { label: "被拉黑", value: "blocked" },
      ],
    },
    closePhoneAfter: {
      type: "boolean",
      label: "回复后关闭手机（仅必须回复时生效）",
      default: false,
    },
    closeDelayMs: {
      type: "number",
      label: "关闭延迟（毫秒）",
      default: 1000,
      min: 0,
      max: 60_000,
      step: 100,
    },
    groupId: {
      type: "string",
      label: "群 ID",
      required: true,
    },
    sender: {
      type: "character",
      label: "发送者",
      required: true,
    },
    ...buildFriendMessageSchemaFields("群成员"),
    ...buildReplySchemaFields(),
  },
  async run(ctx, params) {
    await executeSendGroupMessages(
      ctx,
      params as Record<string, unknown>,
      this.save,
      true,
      { openPhoneApp: true },
    );
  },
  async runImmediately(ctx, params) {
    await executeSendGroupMessages(
      ctx,
      params as Record<string, unknown>,
      this.save,
      false,
      { openPhoneApp: false },
    );
  },
  async skip(ctx, params) {
    await executeSendGroupMessages(
      ctx,
      params as Record<string, unknown>,
      this.save,
      false,
      { openPhoneApp: false },
    );
  },
});

/** 为群聊写入玩家回复选项。 */
export const chatAwaitGroupReplyMethod = method({
  id: "await-group-reply",
  title: "聊天 · 玩家回复群聊",
  description: "配置群聊中的玩家回复；必须回复时打开该群并挂起剧情。",
  schema: {
    requireReply: {
      type: "boolean",
      label: "必须回复",
      default: true,
    },
    outgoingStatus: {
      type: "enum",
      label: "我方消息状态",
      default: "read",
      options: [
        { label: "发送中", value: "sending" },
        { label: "未读", value: "unread" },
        { label: "已读", value: "read" },
        { label: "失败", value: "failed" },
        { label: "被拉黑", value: "blocked" },
      ],
    },
    closePhoneAfter: {
      type: "boolean",
      label: "回复后关闭手机",
      default: false,
    },
    closeDelayMs: {
      type: "number",
      label: "关闭延迟（毫秒）",
      default: 1000,
      min: 0,
      max: 60_000,
      step: 100,
    },
    groupId: {
      type: "string",
      label: "群 ID",
      required: true,
    },
    ...buildReplySchemaFields(),
  },
  async run(ctx, params) {
    await executeAwaitGroupReply(
      ctx,
      params as Record<string, unknown>,
      this.save,
      true,
      { openPhoneApp: true },
    );
  },
  async runImmediately(ctx, params) {
    await executeAwaitGroupReply(
      ctx,
      params as Record<string, unknown>,
      this.save,
      false,
      { openPhoneApp: false },
    );
  },
  async skip(ctx, params) {
    await executeAwaitGroupReply(
      ctx,
      params as Record<string, unknown>,
      this.save,
      false,
      { openPhoneApp: false },
    );
  },
});

/** 将指定角色加入群聊；重复加入不会产生额外成员。 */
export const chatJoinGroupMethod = method({
  id: "join-group",
  title: "聊天 · 角色加入群聊",
  description: "将角色加入作者设置中已定义的群聊，变更随当前存档保存。",
  schema: {
    groupId: {
      type: "string",
      label: "群 ID",
      required: true,
    },
    member: {
      type: "character",
      label: "加入的角色",
      required: true,
    },
  },
  run(ctx, params) {
    prepareRuntime(this.save, ctx);
    joinGroupMember(String(params.groupId ?? ""), String(params.member ?? ""));
  },
  runImmediately(ctx, params) {
    prepareRuntime(this.save, ctx);
    joinGroupMember(String(params.groupId ?? ""), String(params.member ?? ""));
  },
  skip(ctx, params) {
    prepareRuntime(this.save, ctx);
    joinGroupMember(String(params.groupId ?? ""), String(params.member ?? ""));
  },
});

/** 将指定角色退出群聊；重复退出不会产生额外变更。 */
export const chatLeaveGroupMethod = method({
  id: "leave-group",
  title: "聊天 · 角色退出群聊",
  description: "将角色从作者设置中已定义的群聊移出，聊天记录保持不变。",
  schema: {
    groupId: {
      type: "string",
      label: "群 ID",
      required: true,
    },
    member: {
      type: "character",
      label: "退出的角色",
      required: true,
    },
  },
  run(ctx, params) {
    prepareRuntime(this.save, ctx);
    leaveGroupMember(String(params.groupId ?? ""), String(params.member ?? ""));
  },
  runImmediately(ctx, params) {
    prepareRuntime(this.save, ctx);
    leaveGroupMember(String(params.groupId ?? ""), String(params.member ?? ""));
  },
  skip(ctx, params) {
    prepareRuntime(this.save, ctx);
    leaveGroupMember(String(params.groupId ?? ""), String(params.member ?? ""));
  },
});

/**
 * 「添加好友」方法描述。
 *
 * @remarks
 * 方法 ID：`add-friend`。`runImmediately` / `skip` 与 `run` 行为一致。
 */
export const chatAddFriendMethod = method({
  id: "add-friend",
  title: "聊天 · 添加好友",
  description: "将角色加入可见好友列表（不删历史消息）。",
  schema: {
    friend: {
      type: "character",
      label: "好友角色",
      required: true,
    },
  },
  run(ctx, params) {
    prepareRuntime(this.save, ctx);
    addFriend(String(params.friend ?? ""));
  },
  runImmediately(ctx, params) {
    prepareRuntime(this.save, ctx);
    addFriend(String(params.friend ?? ""));
  },
  skip(ctx, params) {
    prepareRuntime(this.save, ctx);
    addFriend(String(params.friend ?? ""));
  },
});

/**
 * 「移除好友」方法描述。
 *
 * @remarks
 * 方法 ID：`remove-friend`。仅隐藏列表，保留聊天记录；可再添加恢复。
 * `runImmediately` / `skip` 与 `run` 行为一致。
 */
export const chatRemoveFriendMethod = method({
  id: "remove-friend",
  title: "聊天 · 移除好友",
  description: "从列表隐藏好友，保留聊天记录；可再添加恢复。",
  schema: {
    friend: {
      type: "character",
      label: "好友角色",
      required: true,
    },
  },
  run(ctx, params) {
    prepareRuntime(this.save, ctx);
    removeFriend(String(params.friend ?? ""));
  },
  runImmediately(ctx, params) {
    prepareRuntime(this.save, ctx);
    removeFriend(String(params.friend ?? ""));
  },
  skip(ctx, params) {
    prepareRuntime(this.save, ctx);
    removeFriend(String(params.friend ?? ""));
  },
});
