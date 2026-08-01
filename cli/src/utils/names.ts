/**
 * @file names.ts
 * @description 由 app-id 推导 PascalCase、注册函数名、包名、扩展 ID。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
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
 * npm 包名。
 *
 * @param appId - 应用 ID
 * @returns 如 `phone-app-demo-shop`
 */
export function toPackageName(appId: string): string {
  return `phone-app-${appId}`;
}

/**
 * extension.json id。
 *
 * @param appId - 应用 ID
 * @returns 如 `ink.zenly.phone-app-demo-shop`
 */
export function toExtensionId(appId: string): string {
  return `ink.zenly.phone-app-${appId}`;
}
