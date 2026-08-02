/**
 * @file names.ts
 * @description 由 app-id / extension-id 推导 PascalCase、注册函数名、npm 包名。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.2
 */

/**
 * kebab-case app-id → PascalCase。
 *
 * @param appId - 如 `demo-shop`
 * @returns 如 `DemoShop`
 */
export function toPascalCase(appId: string): string {
  return appId
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

/**
 * 注册函数名。
 *
 * @param appId - 应用 ID
 * @returns 如 `registerDemoShopPhoneApp`
 */
export function toRegisterFnName(appId: string): string {
  return `register${toPascalCase(appId)}PhoneApp`;
}

/**
 * 由扩展包 id 得到 npm `package.json` name（小写；允许点号）。
 *
 * @param extensionId - 用户指定的 extension.json.id
 * @returns 规范化后的包名
 *
 * @example
 * ```ts
 * toPackageName("com.acme.my-phone"); // => "com.acme.my-phone"
 * ```
 */
export function toPackageName(extensionId: string): string {
  return extensionId.trim().toLowerCase();
}
