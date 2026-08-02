/**
 * @file validate.ts
 * @description app-id / extension-id 合法性校验。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.2
 */

/** 合法 app-id（内页程序 ID）：小写字母开头，后接小写字母/数字/连字符 */
export const APP_ID_RE = /^[a-z][a-z0-9-]*$/;

/**
 * 合法扩展包 id（宿主或 pack 产物 extension.json.id）：
 * 小写字母开头，允许小写字母 / 数字 / 点 / 连字符（如 `com.acme.my-phone`）。
 */
export const EXTENSION_ID_RE = /^[a-z][a-z0-9.-]*$/;

/**
 * 断言 app-id 合法。
 *
 * @param appId - 待校验内页程序 ID
 * @returns void
 * @throws Error 非法时抛出（消息含中文说明与正则提示）
 *
 * @example
 * ```ts
 * assertValidAppId("demo-shop");
 * ```
 */
export function assertValidAppId(appId: string): void {
  if (!APP_ID_RE.test(appId)) {
    throw new Error(
      `非法 app-id「${appId}」。须匹配 ^[a-z][a-z0-9-]*$（小写字母开头，仅小写字母/数字/连字符）`,
    );
  }
}

/**
 * 断言扩展包 id 合法。
 *
 * @param extensionId - 待校验 extension.json.id
 * @returns void
 * @throws Error 非法时抛出
 *
 * @example
 * ```ts
 * assertValidExtensionId("com.acme.my-phone");
 * assertValidExtensionId("my-phone-host");
 * ```
 */
export function assertValidExtensionId(extensionId: string): void {
  if (!EXTENSION_ID_RE.test(extensionId)) {
    throw new Error(
      `非法 extension-id「${extensionId}」。须匹配 ^[a-z][a-z0-9.-]*$（小写字母开头，可含小写字母/数字/点/连字符）`,
    );
  }
}
