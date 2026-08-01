/**
 * @file vite.config.ts
 * @description {{title}} 手机宿主库构建：单入口 src/index.tsx → dist/index.mjs。
 * @author {{author}}
 * @date {{date}}
 * @version 0.3.1
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * 从 extension.json 读取宿主扩展包 id，供 phone-sdk 注入。
 *
 * @remarks
 * 缺省或空字符串时回退到 `ink.zenly.ext-7a9373`。
 */
const extensionJson = JSON.parse(
  readFileSync(path.resolve(rootDir, "extension.json"), "utf8"),
) as { id?: string };

/**
 * 宿主扩展包 id（写入 `__PHONE_HOST_EXTENSION_ID__`）。
 *
 * @constant
 */
const hostExtensionId =
  typeof extensionJson.id === "string" && extensionJson.id.trim() !== ""
    ? extensionJson.id.trim()
    : "ink.zenly.ext-7a9373";

/**
 * Vite 配置：宿主入口 `src/index.tsx` → `dist/index.mjs`。
 *
 * @returns Vite UserConfig
 *
 * @remarks
 * - define：`__PHONE_HOST_EXTENSION_ID__` 来自 extension.json.id
 * - external：react / @avg-studio/sdk；phone-sdk 打进 bundle
 * - watch 时保留 dist 内已有文件（`emptyOutDir: false`）
 *
 * @example
 * ```bash
 * pnpm build
 * pnpm watch
 * ```
 */
export default defineConfig(() => {
  const isWatch = process.argv.includes("--watch");

  return {
    plugins: [react()],
    define: {
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
        ],
      },
      outDir: "dist",
      emptyOutDir: !isWatch,
      sourcemap: true,
      minify: false,
    },
  };
});
