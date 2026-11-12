# {{title}} 独立手机软件

同时启用手机宿主。桌面完整引用：`{{extensionId}}/{{appId}}`。
`src/index.tsx` 注册 UI 并原样导出应用控制器；设置、存档和剧情方法随控制器保留。
`pnpm install`、`pnpm build` 构建 `dist/index.mjs`。

发布文件由 Studio 扩展工坊按 `extension.json` 与构建产物导入。CLI 不自动上传、推送或修改版本。
将已有软件从原扩展拆为新扩展会改变 Studio 存储所属的扩展包；不要直接替换现有工程，迁移需要单独规划。
