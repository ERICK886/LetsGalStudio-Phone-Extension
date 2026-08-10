/**
 * @file register.tsx
 * @description 向 Phone SDK 注册聊天内页应用。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 *
 * @remarks
 * 注册程序 ID = `phone-chat`；展示名 / 编辑器 Tab 为「聊天APP」。
 */

import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";

import { PROGRAM_ID } from "../constants";
import { ChatApp } from "./ChatApp";

/**
 * 注册程序 ID = `phone-chat` 的内页（宿主绑定填 `phone-chat` 即可）。
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
    title: "聊天APP",
    description: "手机聊天内页，浏览聊天记录与好友",
    styleEditor: {
      enabled: true,
      label: "聊天APP",
      icon: "comments",
      order: 100,
    },
    render: (props) => <ChatApp {...props} />,
  });
}
