# {{title}}

工程角色：`{{projectKind}}`；扩展 ID：`{{extensionId}}`。

- `src/index.tsx`：导出 Studio 控制器。
- `src/phone-apps.ts`：注册软件；与控制器导出缺一不可。
- `src/apps/{{appId}}/`：软件 UI、控制器与 `phone-app.json`。
- `phone-project.json`：CLI 目录协议。

`pnpm install` 安装依赖，`pnpm build` 构建，`pnpm watch` 监听源码。
`create-phone-app add notes --title 便签` 增加软件。
`create-phone-app doctor` 检查接入，`create-phone-app pack {{appId}}` 准备独立分发包。

独立软件模式需要同时启用手机宿主。桌面应用引用可填 `{{extensionId}}/{{appId}}`。
应用设置与存档放在软件控制器，不要因注册或重新挂载重置。
SDK 新版与 CLI 必须配套；本仓开发时自动使用本地 SDK，发布前按 CLI 文档检查版本。
