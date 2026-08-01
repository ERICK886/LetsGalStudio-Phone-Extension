/**
 * @file host-extension-id.ts
 * @description 宿主扩展包 id：Vite 注入优先，否则回退官方默认。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.4.0
 */

/**
 * 未注入 `__PHONE_HOST_EXTENSION_ID__` 时的兼容默认值（历史官方宿主包 id）。
 *
 * @constant
 */
export const DEFAULT_PHONE_HOST_EXTENSION_ID = "ink.zenly.ext-7a9373";

/**
 * 纯函数：根据注入字符串解析宿主扩展包 id（便于单测，不读全局）。
 *
 * @param injected - Vite define 注入值；`undefined` / 空 / 空白视为未注入
 * @returns 非空扩展包 id
 *
 * @example
 * ```ts
 * resolvePhoneHostExtensionId("ink.zenly.phone-app-foo");
 * // => "ink.zenly.phone-app-foo"
 * resolvePhoneHostExtensionId(undefined);
 * // => "ink.zenly.ext-7a9373"
 * ```
 */
export function resolvePhoneHostExtensionId(
  injected: string | undefined,
): string {
  if (typeof injected === "string" && injected.trim() !== "") {
    return injected.trim();
  }

  return DEFAULT_PHONE_HOST_EXTENSION_ID;
}

/**
 * 读取构建期注入的宿主扩展包 id。
 *
 * @returns 宿主 `extension.json.id`（注入）或默认官方 id
 * @throws 无（永不抛出）
 *
 * @example
 * ```ts
 * // vite.config.ts:
 * // define: { __PHONE_HOST_EXTENSION_ID__: JSON.stringify(ext.id) }
 * getPhoneHostExtensionId(); // => "ink.zenly.phone-app-foo"
 * ```
 */
export function getPhoneHostExtensionId(): string {
  const injected =
    typeof __PHONE_HOST_EXTENSION_ID__ !== "undefined"
      ? __PHONE_HOST_EXTENSION_ID__
      : undefined;

  return resolvePhoneHostExtensionId(injected);
}

/**
 * 打开手机的输入动作 id：`<hostExtensionId>.open-phone`。
 *
 * @returns 动作字符串
 * @throws 无
 *
 * @example
 * ```ts
 * getOpenPhoneActionId(); // => "ink.zenly.ext-7a9373.open-phone"
 * ```
 */
export function getOpenPhoneActionId(): string {
  return `${getPhoneHostExtensionId()}.open-phone`;
}
