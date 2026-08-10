/**
 * @file register.tsx
 * @description 向 Phone SDK 注册聊天内页应用。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.0
 */

import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";

import { PROGRAM_ID } from "../constants";
import { ChatApp } from "./ChatApp";

/**
 * 注册程序 ID = `phone-chat` 的内页（宿主绑定须写完整 `扩展ID/phone-chat`）。
 *
 * @returns void
 * @throws 不抛出；非法参数由 phone-sdk 警告并忽略
 *
 * @example
 * ```ts
 * static onRegister() {
 *   registerChatPhoneApp();
 * }
 * ```
 */
export function registerChatPhoneApp(): void {
  registerPhoneApp({
    id: PROGRAM_ID,
    title: "聊天",
    description: "手机聊天内页，浏览聊天记录与好友",
    render: (props) => <ChatApp {...props} />,
  });
}
