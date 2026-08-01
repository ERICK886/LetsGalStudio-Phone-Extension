# {{title}}

由 [create-phone-app](https://github.com/ink-zenly/ext-7a9373) 生成的 LetsGal Studio 手机内页独立扩展。

## 依赖说明

1. **`@avg-studio/sdk`**：请按 Studio 扩展开发文档安装（本地 `sdk/` 目录或官方 npm 包）。
2. **`@ink-zenly/phone-sdk`**：模板使用 npm 版本 `{{phoneSdkVersion}}`；若 registry 尚未发布，请手动修改 `package.json` 或先发布该包。
3. **宿主配置**：在手机宿主扩展设置中，将「动作 · 手机内部应用」的 `phoneAppId` 设为 **`{{appId}}`**。

## 开发与构建

```bash
pnpm install
pnpm build    # 单次构建，产物 dist/index.mjs
pnpm watch    # 监听源码变化并自动重建
```

构建完成后，将本扩展目录放入 Studio 扩展路径，或在 Studio 中打开本项目并执行「构建扩展（自动装依赖）」。

## 程序 ID

- 扩展清单 id：`{{extensionId}}`
- 手机内页 app-id：`{{appId}}`
- npm 包名：`{{packageName}}`
