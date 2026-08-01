/// <reference types="vite/client" />

/**
 * 由 Vite `define` 注入：扩展入口是否登记了内页应用清单。
 * 当前 watch / build 恒为 `true`。
 */
declare const __PHONE_PLUGIN_DEV__: boolean;

/**
 * 由 Vite `define` 注入：本仓 `extension.json` 的 `id`。
 */
declare const __PHONE_HOST_EXTENSION_ID__: string | undefined;

declare module "*.css?inline" {
  const css: string;
  export default css;
}
