/**
 * @file vite.config.ts
 * @description {{title}} 独立扩展库构建配置；输出 dist/index.mjs 供 Studio 加载。
 * @author {{author}}
 * @date {{date}}
 * @version 0.1.0
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite 配置。
 *
 * @returns Vite UserConfig
 *
 * @remarks
 * - lib 模式，入口 `src/index.tsx`。
 * - 运行时依赖 external，由 Studio 宿主提供。
 * - 产物固定为 `dist/index.mjs`（无 hash chunk）。
 *
 * @example
 * ```bash
 * pnpm build
 * pnpm watch
 * ```
 */
export default defineConfig({
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
        "@avg-studio/sdk",
        "@ink-zenly/phone-sdk",
        "@ink-zenly/phone-sdk/plugin",
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
  },
});
