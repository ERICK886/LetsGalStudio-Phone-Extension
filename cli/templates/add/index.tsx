/**
 * @file index.tsx
 * @description {{title}}：向 Phone SDK 注册手机内部应用。
 * @author {{author}}
 * @date {{date}}
 * @version 0.1.0
 *
 * @remarks
 * - `PROGRAM_ID` 必须与作者设置的 `phoneAppId`、将来独立扩展的 `@extension({ id })` 一致。
 * - 由 `src/index.tsx` 经 `bootstrapPhonePluginApps` 调用。
 * - 仅依赖 `@ink-zenly/phone-sdk/plugin`。
 */

import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { {{pascalName}}App } from "./app";

/**
 * Studio 程序 ID（亦为 Phone SDK 应用 id）。
 *
 * @constant
 */
export const PROGRAM_ID = "{{appId}}";

/**
 * 向手机宿主注册本应用。
 *
 * @returns void
 * @throws 不抛出；非法参数由 phone-sdk 警告并忽略
 *
 * @example
 * ```ts
 * // src/index.tsx
 * bootstrapPhonePluginApps(
 *   definePhonePluginRegistry({{registerFnName}}),
 * );
 * ```
 */
export function {{registerFnName}}(): void {
  registerPhoneApp({
    id: PROGRAM_ID,
    title: "{{titleJs}}",
    description: "src/{{appId}} 内页",
    render: (props) => <{{pascalName}}App {...props} />,
  });
}
