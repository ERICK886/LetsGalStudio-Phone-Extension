/**
 * @file constants.ts
 * @description 手机聊天内页模块常量（宿主包 id、程序 ID）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.1
 *
 * @remarks
 * - 本模块从独立扩展 `ink.zenly.app-015abe` 迁入宿主包 `ink.zenly.ext-7a9373`。
 * - Studio 方法块 `target` 仍以扩展包 id 开头，例如
 *   `ink.zenly.ext-7a9373/phone-chat/send-friend-messages`。
 * - 宿主「动作 · 手机内部应用」的 Phone SDK 应用 ID：**只填程序 ID** `phone-chat`
 *  （与 `registerPhoneApp({ id })` 一致），无需再写扩展包 ID。
 */

/**
 * 扩展包 id（与宿主 `extension.json` 的 `id` 一致，可含点号）。
 */
export const EXTENSION_ID = "ink.zenly.ext-7a9373";

/**
 * Studio 程序 ID / `registerPhoneApp({ id })` / 宿主 Phone SDK 应用 ID。
 */
export const PROGRAM_ID = "phone-chat";

/**
 * 宿主「动作 · 手机内部应用」应填写的 Phone SDK 应用 ID（= 程序 ID）。
 */
export const PHONE_APP_REF = PROGRAM_ID;

/** 单次方法最多推送的消息条数。 */
export const MAX_MESSAGES_PER_METHOD = 8;

/** 单次方法最多附带的玩家回复选项数。 */
export const MAX_REPLIES_PER_METHOD = 6;

/** 每条回复最多的写变量效果数。 */
export const MAX_EFFECTS_PER_REPLY = 4;
