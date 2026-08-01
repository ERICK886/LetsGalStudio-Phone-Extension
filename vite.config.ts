/**
 * @file vite.config.ts
 * @description 手机扩展库构建配置；watch / build 打进 src/<app-id>/ 内页。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.4.0
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const extensionJson = JSON.parse(
  readFileSync(path.resolve(rootDir, "extension.json"), "utf8"),
) as { id?: string };

const hostExtensionId =
  typeof extensionJson.id === "string" && extensionJson.id.trim() !== ""
    ? extensionJson.id.trim()
    : "ink.zenly.ext-7a9373";

/**
 * Vite 配置。
 *
 * @returns Vite UserConfig
 *
 * @remarks
 * - 入口固定为 `src/index.tsx`（调用 `bootstrapPhonePluginApps`）。
 * - 已进入模块图的 `src/<app-id>/**` 会由 `pnpm watch` 默认监听。
 * - Studio 只加载 `dist/index.mjs`，故禁止拆 chunk。
 * - watch 时关闭 `emptyOutDir`，改为原地覆盖产物，便于 Studio 热刷新预览。
 * - 本库输出固定为 `index.mjs` + sourcemap（无哈希 chunk），watch 不清空也安全；
 *   单次 `pnpm build` 仍清空 dist，避免残留旧 map/杂文件。
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 对外仍为 /plugin；内部目录为 client/
      "@ink-zenly/phone-sdk/plugin": path.resolve(rootDir, "phone-sdk/src/client/index.ts"),
      "@ink-zenly/phone-sdk": path.resolve(rootDir, "phone-sdk/src/index.ts"),
    },
  },
  define: {
    /**
     * 扩展入口是否登记了内页应用清单（恒为 true）。
     * 宿主本身不编写内页；该标志仅供诊断快照。
     */
    __PHONE_PLUGIN_DEV__: JSON.stringify(true),
    /**
     * 本仓 `extension.json` 的 `id`，供 phone-sdk 宿主解析 open-phone 等命令前缀。
     */
    __PHONE_HOST_EXTENSION_ID__: JSON.stringify(hostExtensionId),
  },
  build: {
    lib: {
      entry: path.resolve(rootDir, "src/index.tsx"),
      formats: ["es"],
      fileName: () => "index.mjs",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@avg-studio/sdk",
        // phone-sdk 需打进本扩展 bundle，以便安装宿主；第三方独立扩展构建时应将其 external。
      ]
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
  },
});
