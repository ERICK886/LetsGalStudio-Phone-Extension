/**
 * @file index.tsx
 * @description 示例商店：向 Phone SDK 注册手机内部应用。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.0
 *
 * @remarks
 * - `PROGRAM_ID` 必须与作者设置的 `phoneAppId`、将来独立扩展的 `@extension({ id })` 一致。
 * - 由 `src/index.tsx` 经 `bootstrapPhonePluginApps` 调用。
 * - 仅依赖 `@ink-zenly/phone-sdk/plugin`。
 */

import { listRegisteredPhoneApps, registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { DemoShopApp } from "./app";

/**
 * Studio 程序 ID（亦为 Phone SDK 应用 id）。
 *
 * @constant
 */
export const PROGRAM_ID = "demo-shop";

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
 *   definePhonePluginRegistry(registerDemoShopPhoneApp),
 * );
 * ```
 */
export function registerDemoShopPhoneApp(): void {
  console.info("[phone-sdk-diag]", "demo-shop：调用 registerPhoneApp", {
    id: PROGRAM_ID,
    alreadyListed: listRegisteredPhoneApps().map((app) => app.id),
  });

  registerPhoneApp({
    id: PROGRAM_ID,
    title: "示例商店",
    description: "src/demo-shop 内页示例",
    render: (props) => <DemoShopApp {...props} />,
  });

  console.info("[phone-sdk-diag]", "demo-shop：registerPhoneApp 已返回", {
    id: PROGRAM_ID,
    listedAfter: listRegisteredPhoneApps().map((app) => app.id),
  });
}
