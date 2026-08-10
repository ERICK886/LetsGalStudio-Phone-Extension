/**
 * @file constants.ts
 * @description 手机聊天内页模块常量（宿主包 id、程序 ID、应用完整引用）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * - 本模块从独立扩展 `ink.zenly.app-015abe` 迁入宿主包 `ink.zenly.ext-7a9373`，
 *   作为 `src/phone-chat/` 模块存在；不再以独立 Extension 形式注册。
 * - `EXTENSION_ID` 与宿主 `extension.json` 的 `id` 一致；Studio 方法块 `target`
 *   以该 id 开头，例如 `ink.zenly.ext-7a9373/phone-chat/send-friend-messages`。
 * - `PROGRAM_ID` 与 `@extension({ id })` / `registerPhoneApp({ id })` 一致，
 *   SDK 要求 kebab-case（仅 a-z、0-9、-），**不能**使用带点号的包 id。
 * - 宿主「动作 · 手机内部应用」须填完整路径：
 *   `{EXTENSION_ID}/{PROGRAM_ID}` → `ink.zenly.ext-7a9373/phone-chat`（phone-sdk ≥ 0.5.5）。
 */

/**
 * 扩展包 id（与宿主 `extension.json` 的 `id` 一致，可含点号）。
 */
export const EXTENSION_ID = "ink.zenly.ext-7a9373";

/**
 * Studio 程序 ID / `@extension({ id })` / `registerPhoneApp({ id })`。
 */
export const PROGRAM_ID = "phone-chat";

/**
 * 宿主设置里「Phone SDK 应用 ID」完整路径。
 *
 * @remarks
 * 由 `扩展ID/程序ID` 拼接，供宿主「动作 · 手机内部应用」字段使用。
 */
export const PHONE_APP_REF = `${EXTENSION_ID}/${PROGRAM_ID}`;

/** 单次方法最多推送的消息条数。 */
export const MAX_MESSAGES_PER_METHOD = 8;

/** 单次方法最多附带的玩家回复选项数。 */
export const MAX_REPLIES_PER_METHOD = 6;

/** 每条回复最多的写变量效果数。 */
export const MAX_EFFECTS_PER_REPLY = 4;
