/**
 * @file vite-env.d.ts
 * @description phone-sdk 侧 Vite / 构建期类型声明。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

/// <reference types="vite/client" />

/**
 * 由扩展入口 Vite `define` 注入：当前 bundle 是否附带了外部内页清单。
 * 宿主代码不依赖其业务含义，仅供诊断快照展示。
 */
declare const __PHONE_PLUGIN_DEV__: boolean;

declare module "*.css?inline" {
  const css: string;
  export default css;
}
