/**
 * @file vite.config.ts
 * @description {{title}} 手机宿主库构建：单入口 src/index.tsx → dist/index.mjs。
 * @author {{author}}
 * @date {{date}}
 * @version 0.3.0
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite 配置：宿主入口 `src/index.tsx` → `dist/index.mjs`。
 *
 * @returns Vite UserConfig
 *
 * @remarks
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
