/**
 * @file methods.ts
 * @description 聊天内页四个 Studio 方法的 `method()` 描述，供 Task 4 在
 *              `StudioPhoneExtension` 类体上以静态属性赋值挂载。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 本模块**不**定义 `Extension` 子类，也不在加载时 `attach`；
 *   只导出四个已构造好的 `method()` 结果（`BrandedExtensionMethod`）。
 * - `run` / `runImmediately` / `skip` 里的 `this` 是宿主包装类实例，
 *   `this.save` 是该实例的 save（键为 `chat*` 前缀）。
 *   每个执行体先调用 `bindChatSave(this.save)`，由 store 适配器翻译键名。
 * - `addFriend` / `removeFriend` 的 `runImmediately` / `skip` 直接复用 `run` 逻辑
 *   （等价于原 `ChatController.addFriend.run.call(this, ...)`）。
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
  awaitPlayerReply,
  bindChatSave,
  cacheAuthorSettings,
  closeChatPhoneAppAfter,
  openChatPhoneApp,
  readAuthorSettings,
  removeFriend,
  sendFriendMessages,
} from "./runtime/index";

/**
 * 绑定 save 并刷新作者设置缓存。
 *
 * @param instanceSave - 包装类实例 this.save（键为 `chat*` 前缀）
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
  await sendFriendMessages({
    friendCharacterId,
    messages: parseFriendMessagesFromParams(params),
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
  const requireReply = coerceMethodBoolean(params.requireReply, true);
  // 正常 run + 必须回复 → 挂起；非必须 → 只写 pending
  const waitForReply = allowWait && requireReply;
  // 必须回复时强制打开并跳转会话；非必须绝不打开
  const shouldOpenPhone = options.openPhoneApp && waitForReply;

  await awaitPlayerReply(ctx, {
    friendCharacterId,
    replies: parseRepliesFromParams(params),
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

/**
 * 「对方发送消息」方法描述。
 *
 * @remarks
 * 方法 ID：`send-friend-messages`。供 Task 4 在 `StudioPhoneExtension` 上赋值：
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
