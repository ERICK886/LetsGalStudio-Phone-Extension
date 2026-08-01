# {{title}}

由 [create-phone-app](https://github.com/ink-zenly/ext-7a9373) 生成的 LetsGal Studio **手机宿主扩展**（含首个内页 `src/{{appId}}/`）。

## 依赖说明

1. **`@avg-studio/sdk`**：脚手架已将 SDK 拷贝到本工程 **`sdk/`**，并通过 `dependencies` 的 `file:./sdk` 引用（**不要**把 `file:` 写进 `peerDependencies`）。
2. **`@ink-zenly/phone-sdk`**：模板使用 npm 版本 `{{phoneSdkVersion}}`。
3. **程序 ID**：手机内页 app-id 为 **`{{appId}}`**（扩展清单 id：`{{extensionId}}`）。
4. **宿主扩展包 id**：`vite.config.ts` 已配置从 `extension.json` define `__PHONE_HOST_EXTENSION_ID__`（phone-sdk ≥0.4.0 需要）。

## 开发（含完整手机宿主）

```powershell
pnpm install
pnpm watch                 # 监听构建 → dist/index.mjs
```

在 Studio 中**仅启用本扩展**即可看到手机壳并打开内页。入口为 `src/index.tsx`，导出 `PhoneExtension` / `ToastExtension`。

## 分发标准内页包

若需将 `src/{{appId}}/` 抽离为不含手机壳的标准内页扩展，在宿主工程根目录执行：

```powershell
pnpm create-phone-app pack {{appId}}
# 产物在 ./release/
```

`release/` 仅含内页扩展，需**同时**启用手机宿主扩展（如 `ink.zenly.ext-7a9373`），并在宿主设置中将 `phoneAppId` 设为 **`{{appId}}`**。

## 程序 ID 速查

| 项 | 值 |
|----|-----|
| 扩展清单 id | `{{extensionId}}` |
| 手机内页 app-id | `{{appId}}` |
| npm 包名 | `{{packageName}}` |
