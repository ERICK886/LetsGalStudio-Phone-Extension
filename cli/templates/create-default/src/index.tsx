/**
 * @file index.tsx
 * @description {{title}} 独立 Studio 扩展入口：注册手机内部应用。
 * @author {{author}}
 * @date {{date}}
 * @version 0.1.0
 *
 * @remarks
 * - `PROGRAM_ID` 必须与宿主设置的 `phoneAppId` 及 `@extension({ id })` 一致。
 * - 独立扩展模式：在 `onRegister` 中调用 `registerPhoneApp`。
 */

import { Extension, extension } from "@avg-studio/sdk";
import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { {{pascalName}}App } from "./app";

/**
 * Studio 程序 ID（亦为 Phone SDK 应用 id）。
 *
 * @constant
 */
const PROGRAM_ID = "{{appId}}";

/**
 * {{title}} 扩展控制器。
 *
 * @remarks
 * `exposeUI: false` 表示不在扩展树单独暴露 UI 模块，仅注册手机内页。
 */
@extension({ id: PROGRAM_ID, label: "{{title}}", exposeUI: false })
export class {{pascalName}}Controller extends Extension {
  /**
   * Studio 加载扩展时调用，向 Phone SDK 注册内页应用。
   *
   * @returns void
   * @throws 不抛出；非法参数由 phone-sdk 警告并忽略
   *
   * @example
   * ```ts
   * // Studio 扫描 bundle 导出并自动调用 onRegister
   * {{pascalName}}Controller.onRegister();
   * ```
   */
  static onRegister() {
    registerPhoneApp({
      id: PROGRAM_ID,
      title: "{{title}}",
      description: "{{title}} 内页应用",
      render: (props) => <{{pascalName}}App {...props} />,
    });
  }
}

export default {{pascalName}}Controller;
