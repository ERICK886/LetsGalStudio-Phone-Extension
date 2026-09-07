# CLAUDE.md

本文件适用于整个仓库。修改前先阅读相关源码、测试与当前工作区差异；`package.json`、`extension.json`、`vite.config.ts`、已安装类型和当前源码优先于可能滞后的 README。

## 架构边界

- 运行链为 `extension.json` → `vite.config.ts` → `src/index.tsx` → 扩展控制器 / 内页注册 → runtime / domain / UI。
- `@ink-zenly/phone-sdk` 是宿主入口；`@ink-zenly/phone-sdk/plugin` 是内页 API。不要跨入口引用内部实现。
- `src/index.tsx` 统一导出宿主模块，并通过 `bootstrapPhonePluginApps(definePhonePluginRegistry(...))` 注册内页。
- `src/phone-chat`、`src/phone-album`、`src/phone-call` 各自维护设置、存档、方法与 UI；优先沿用现有 `domain`、`runtime`、`editor`、`ui` 分层。
- `phone-sdk/` 是随宿主打包并单独发布的 SDK；公共 API 变更必须同步入口导出、类型、测试和相关文档。
- `cli/` 是脚手架；改变生成结构或注册约定时，同步模板、注入逻辑及 CLI 测试。
- `sdk/` 是本地 Studio SDK 合同，不直接修改。`dist/`、`node_modules/`、`release/` 是生成物，不手工编辑。

## 强制约束

- 保留用户已有未提交改动；只做任务所需的小范围修改，不回滚、覆盖或顺手格式化无关文件。
- 保持 UTF-8 与现有中文文案，不因终端乱码重写文件编码。
- 三层 ID 不得混用：宿主扩展 ID 来自 `extension.json.id`；内页程序 ID 必须与 `@extension({ id })`、`PROGRAM_ID`、`registerPhoneApp({ id })` 对齐；宿主模块 ID 如 `phone`、`phone-toast` 独立存在。
- 内页注册只放在根注册表或独立扩展的明确注册钩子中，禁止重复注册。
- `src/phone-call/` 已恢复 APP 注册和 `PhoneCallExtension` 导出；修改时保持 `src/index.tsx` 的内页注册与扩展导出同步。
- 游戏 Preview UI 使用 SDK UI Host（如 `ctx.ui.show`）；不得把 `document.body` 当作游戏画布。`document.body` 只可用于已有的 Studio 编辑器 portal / DOM 适配场景。
- 内页必须处理 `PhoneAppRenderProps.safeAreaInsets`，并区分 `closeApp`（回桌面）与 `closePhone`（关闭手机）。
- 作者设置通过对应模块的 settings bridge 读写并订阅变化；跨模块编辑使用 `ctx.settings.cross`。持久状态必须在所属模块 `saveSchema` 中定义并正确绑定。
- 等待、订阅、键盘拦截和全局状态必须有卸载清理；手机显示期间的交互选项要与实际 UI Host 契约一致。
- TypeScript 保持 `strict`、ESM 和 React 18 函数组件风格；避免新增 `any`、静默 catch、重复状态源和无来源常量。

## 验证与交付

- 先运行受影响模块附近的 `*.test.ts`；CLI 测试在 `cli/` 下使用 `node --import tsx --test src/**/*.test.ts`。仓库没有统一 `test` 脚本时，不得声称全量测试通过。
- 可构建环境中运行 `pnpm run build`；构建入口必须仍产出 `dist/index.mjs`，且 React 与 `@avg-studio/sdk` 保持 external。
- 修改 schema、TypeScript 或 CSS 后，按“构建 → Studio 重载扩展 → 必要时重启 Preview”验证。
- 程序 Preview 只适合检查外观壳；挂载、快捷键、内页点击、剧情消息、来电等运行链必须用剧本 Preview 验证，并确认真实可见、可交互状态。
- `git diff --check` 只能证明差异格式，不等于编译或 UI 验证；工具不在 PATH 时报告准确阻塞，不得虚构成功。
- 未经明确要求不运行 `pnpm run sync`、`sync:full` 或镜像同步，不修改 Studio 安装目录，也不提交、推送或发布。
