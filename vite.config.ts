import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
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
        // phone-sdk 需打进本扩展 bundle，以便安装宿主；第三方扩展构建时应将其 external。
      ],
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
  },
});
