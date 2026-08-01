/**
 * @file validate.ts
 * @description app-id 合法性校验。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

/** 合法 app-id：小写字母开头，后接小写字母/数字/连字符 */
export const APP_ID_RE = /^[a-z][a-z0-9-]*$/;

/**
 * 断言 app-id 合法。
 *
 * @param appId - 待校验 ID
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
