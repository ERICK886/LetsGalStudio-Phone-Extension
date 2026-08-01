/**
 * @file index.tsx
 * @description {{title}} 标准内页扩展入口（pack 产物）。
 * @author {{author}}
 * @date {{date}}
 * @version 0.3.0
 *
 * @remarks
 * - 由 `create-phone-app pack` 生成；内页注册逻辑在 `./{{appId}}`。
 * - 需同时启用手机宿主扩展；宿主 `phoneAppId` 须为 `{{appId}}`。
 */

import { Extension, extension } from "@avg-studio/sdk";

import { {{registerFnName}} } from "./{{appId}}";

/**
 * {{title}} 扩展控制器：在 Studio 加载时注册手机内页。
 */
@extension({ id: "{{appId}}", label: "{{titleJs}}", exposeUI: false })
export class {{pascalName}}Controller extends Extension {
  /**
   * Studio 扫描 bundle 导出并调用，触发内页注册。
   *
   * @returns void
   * @throws 不抛出；非法参数由 phone-sdk 警告并忽略
   *
   * @example
   * ```ts
   * {{pascalName}}Controller.onRegister();
   * ```
   */
  static onRegister() {
    {{registerFnName}}();
  }
}

export default {{pascalName}}Controller;
