# 开发约束

本文件适用于整个仓库。用户明确指令优先；子目录 AGENTS.md 可补充其范围内的约束。修改前阅读相关源码、测试和 [CLAUDE.md](CLAUDE.md)。实际配置、当前源码与目标 Studio SDK 合同优先于可能滞后的说明文档。

## 1. 开始工作

- 先检查 `git status --short` 和相关文件的 diff，保留已有未提交/未跟踪内容。只修改任务需要的文件，不回滚、覆盖或顺手格式化无关内容。
- 分析、审计、检查类请求先只读代码；用户要求修复后再改运行时。整理文档时不要顺带修代码、升级依赖或修改版本号。
- 沿实际调用链定位问题：manifest → 构建入口 → 模块导出/内页注册 → settings/save → runtime → UI → 关闭/剧情继续。不得仅凭某个按钮、源码片段或构建成功断言运行正常。
- 先确认工具和本地依赖可用。工具不在 PATH 时可使用已安装的明确路径；不得为完成检查擅自安装工具或同步 Studio。

## 2. 项目边界

- `extension.json` / `vite.config.ts` / `src/index.tsx` 分别维护扩展清单、构建和根模块导出/注册。
- `phone-sdk/src/index.ts` 为宿主公开入口；`phone-sdk/src/client/index.ts` 为 `/plugin` 公开入口。宿主桥接底层 API 当前也在 `/plugin` 导出，以实际 exports 为准。
- `src/phone-chat`、`src/phone-album`、`src/phone-call` 分别拥有业务设置、存档、方法、运行时与 UI；沿用其 domain/runtime/editor/ui 分层，不将业务初始化隐式塞入 SDK 宿主。
- `cli/` 维护 create/add/pack、模板、注入与版本解析。生成结构或接入约定变更时，连同模板、CLI 测试和说明一起检查。
- `sdk/` 与 `cli/vendor/avg-studio-sdk/` 是 Studio SDK 合同副本，不为消除报错直接改动或添加虚假 API。需要更新时明确来源和目标版本，遵循用户授权的同步范围。
- 不手工修改 `dist/`、`node_modules/`、`release/` 等生成物；通过对应构建或生成流程更新。

## 3. 模块、ID 与构建

- 扩展侧从 `@ink-zenly/phone-sdk` 或 `@ink-zenly/phone-sdk/plugin` 公开入口导入，不深引用内部路径。客户端新增能力不得隐式引入宿主编辑器或业务应用依赖。
- 区分扩展包 ID、程序 ID、桌面目录条目 ID：扩展包 ID 来自 manifest；业务 `PROGRAM_ID`、`@extension.id`、`registerPhoneApp.id` 必须一致；桌面条目通过动作 ID 绑定目标程序。
- 当前注册表按程序 ID 索引，完整 `扩展ID/程序ID` 不提供命名空间隔离。新增应用使用足够唯一的程序 ID；命名空间协议变更需迁移及兼容测试。
- 内页统一在根 bootstrap 清单或独立扩展的明确注册钩子中注册，避免重复登记。业务控制器导出与内页注册一起检查，尤其保持电话 APP 的两个入口同步。
- 完整宿主应导出 `PhoneExtension`、`PhoneHudExtension`、`ToastExtension`、`PhoneEditorExtension`；有意裁剪模块时说明其影响，不能只凭模板文件存在判断功能完整。
- 构建从 manifest 注入 `__PHONE_HOST_EXTENSION_ID__`，保持 `src/index.tsx` → `dist/index.mjs` 的单入口约定。
- React、React DOM、JSX runtime 和 `@avg-studio/sdk` 保持 external；phone-sdk 按当前宿主/pack 模板打入 bundle，共享状态使用全局桥接。
- 检查独立 SDK/CLI 的实际依赖声明及发布 files/exports，不依赖仓库根目录偶然提供的包。版本解析区分本仓来源与独立 CLI 兜底，不把仓库版本当成已发布版本。

## 4. SDK 接口与数据

- 公共 API 变更同步入口导出、类型、运行时实现、参数规范化、有效回归测试和 [SDK README](phone-sdk/README.md)。涉及脚手架时同步生成物契约。
- 编辑器 fieldType/preview/assetKind 等新增值必须通过注册白名单、schema 构造、属性面板和实际渲染全链路；禁止仅扩大类型联合而使运行时静默丢弃。
- 返回值与 Promise 完成时机要有准确语义。`opened` 当前不保证内页就绪；回桌面、关闭外壳、关闭被锁拦截和卸载能力必须区分。
- 作者设置通过对应模块的 bridge 读写并订阅，跨模块使用 `ctx.settings.cross`；编辑器 schema 不自动创建 settings。写入值保持声明类型，数字校验有限值/边界，布尔不写成字符串。
- 持久状态在所属模块 `saveSchema` 定义并正确绑定；注册、导航 pending、角标、关闭锁与安全区属于内存状态，不冒充存档。
- 保存和迁移兼容现有数据；不得因升级、注册或挂载重置玩家数据。非法输入应明确忽略/返回错误并保留可诊断信息。

## 5. 异步与生命周期

- 跨 bundle 的注册表、队列、导航、锁及通知使用共享槽位；不得以模块私有 Map/WeakMap 代替必须共享的状态。Preview 上下文不能误绑定到其他模块或会话。
- 注册/注销队列保留操作时序，覆盖“注册 → 注销 → 再注册”、宿主晚安装、重复注册和热重载。
- 订阅、timer、键盘监听、全局回调、关闭锁和等待都有明确所有者与幂等清理；卸载只清除属于自身的绑定，旧实例不得清掉新实例状态。
- 对每个外部监听器隔离异常，保证后续通知和必要收尾继续执行。获取锁必须返回可释放句柄，业务使用 try/finally 释放；不得让订阅异常留下无法释放的锁。
- 打开失败、正常关闭、无动画关闭、卸载、flow abort 和动画中途销毁均需结束等待；不可只清计时器却留下未 settle 的 Promise。
- `waitUntil: "none"` 不等待可能直到 UI 关闭才 resolve 的 `ui.show()`；关闭完成需要等待实际隐藏后，才执行依赖关闭结果的剧情。
- 导航 payload 由目标应用消费；按 seq 清除 pending，避免旧请求误删新请求。明确等待的是下一次关闭通知，不依赖历史通知被自动重放。
- 强制交互完成后才可 force 关闭；普通玩家操作不能绕过关闭锁。来电选择先完成运行时处理、释放等待/锁、关闭手机，再运行对应 Fragment。
- 检查 normal/runImmediately/skip、seek、返回、暂停恢复和卸载路径；纯展示消息在即时执行/skip 时沿用现有不弹 UI 的约定。

## 6. UI 与代码风格

- 游戏 UI 通过 Studio UI Host（如 `ctx.ui.show`）挂载，正确设置交互与指针穿透。不得把 `document.body` 当作游戏 Preview 画布。
- 内页处理 `PhoneAppRenderProps.safeAreaInsets`；明确 `closeApp` 回桌面、`closePhone` 关闭手机。保留鼠标、键盘和触屏入口的真实可用性。
- 作者侧复用现有编辑器控件及官方 Inspector/portal 合同。已有 DOM/Fiber 适配属兼容代码，不作为新增正式 API；不得扩散对 Studio 私有 DOM/Fiber 的依赖。
- 保持 strict TypeScript、ESM、React 18 函数组件和 UTF-8 中文。避免新增 any、静默 catch、重复状态源、无来源常量或绕过类型检查。
- 遇到乱码先检查文件实际编码与可靠原文，不凭终端显示结果批量转码或猜测重写。

## 7. 验证

- 功能修复先运行相关 `*.test.ts`；选择能验证用户行为与失败路径的测试，避免仅检查固定计数或复制实现。
- 仓库没有统一 test script；报告实际扫描范围、数量和结果。需要 SDK/内页回归时在根目录执行：

```powershell
$sdkTests = @(rg --files phone-sdk src -g '*.test.ts')
node --import ./cli/node_modules/tsx/dist/loader.mjs --test @sdkTests
node ./node_modules/typescript/bin/tsc --noEmit
pnpm run build
```

- CLI 测试在 `cli/` 下执行，显式收集文件以避免 shell glob 差异：

```powershell
$cliTests = @(rg --files src -g '*.test.ts')
node --import ./node_modules/tsx/dist/loader.mjs --test @cliTests
```

- 测试解析确认使用本仓 phone-sdk 源码，与 Vite/tsconfig alias 一致；不得误测 node_modules 中的旧副本。
- SDK 依赖/发布或模板变更增加隔离工程的生成、安装和构建验证，不能用本仓构建替代独立接入验证。
- TypeScript、测试、构建、`git diff --check` 和真实 Studio 验证分别报告；已有失败说明准确来源，不绕过门禁、不声称全量通过。
- 程序 Preview 只验证外观；挂载、HUD、快捷键、点击、聊天/来电和剧情等待必须用剧本 Preview。重载或重启按用户已有授权执行，无法验证时明确未验证。
- [SDK 检查报告](phone-sdk/AUDIT.md) 是历史快照。修复相关问题后复查并更新结论，不将历史计数或构建结果写成永久保证。
- 纯文档变更检查路径、内容一致性及 diff 即可，不重复无关构建或 UI 测试。

## 8. 交付与授权

- 未经明确要求不运行 sync/sync:full 或镜像同步，不修改 Studio 安装目录，不提交、推送或发布；不能为完成验证擅自重启用户正在使用的 Studio/Preview。
- 获准 Git 交付时，先检查最新远端和分歧，只暂存本任务明确文件、只推指定 ref；保留其他工作，交付时提供已验证的远端 SHA。
- 说明实际修改、验证结果及剩余限制。构建、重载、同步和发布各有独立证据，不把其中一个成功作为其他步骤已完成的证明。
