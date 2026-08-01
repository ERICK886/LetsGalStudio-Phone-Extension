# {{title}}

由 `create-phone-app pack` 生成的**标准内页扩展包**（app-id：`{{appId}}`）。

## 构建

```bash
pnpm install
pnpm build
```

产物：`dist/index.mjs`

开发监听：

```bash
pnpm watch
```

## 分发

1. 将本目录（或 `dist/index.mjs` + `extension.json` + `sdk/`）作为 Studio 扩展启用。
2. **同时**启用手机宿主扩展（如 `ink.zenly.ext-7a9373`）。
3. 在宿主设置中将 `phoneAppId` 配置为 **`{{appId}}`**。

本包**不含**手机壳 UI，仅注册内页；禁止附带 `phone-sdk/`、`scripts/`、`docs/` 等宿主附属目录。
