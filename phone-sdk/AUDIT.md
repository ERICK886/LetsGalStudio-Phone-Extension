# 手机宿主 SDK 完整性检查

检查日期：2026-09-27。范围：本仓 `phone-sdk/`、扩展入口、构建配置、CLI 宿主模板和相关 README。SDK 仓库版本 0.5.26；扩展版本 1.3.2；CLI 版本 0.3.7。以下第 1–6 节保留首次检查快照；后续发布准备的复查见第 7 节。未运行真实 Studio Preview。

## 结论

**核心功能已成体系，但尚不能认定为完善的独立宿主 SDK。原有文档能支持入门，宿主模块、完整 API 和生命周期说明不足，且存在版本漂移。**

已有能力包括桌面与 APP 动作、手机/HUD/Toast/编辑器模块、注册表共享、程序化打开关闭、导航 payload、关闭锁、角标、安全区、编辑器 schema 和调试诊断。

主要缺口集中在独立安装、脚手架、注册顺序、异常与卸载生命周期、类型/运行时规范化一致性，以及真实宿主验证。新增和整理文档不表示这些代码问题已经修复。

## 1. 验证证据

- Node：使用 Codex 内置 Node v24.19.0，系统 PATH 未发现 node/npm/pnpm。
- 手机 SDK 与业务内页：扫描 `phone-sdk/` 和 `src/` 的 48 个 `*.test.ts` 文件，实际 **203 项测试，200 通过、3 失败**，无 skipped/cancelled。
- CLI：10 个测试文件，**36 项全部通过**。
- TypeScript：失败，`sdk/index.ts:22` 引用不存在的 `./extension-inspector`（TS2307）。这是本地 Studio SDK 合同缺失；本次未修改该目录。
- Vite：成功，2118 个模块，输出 `index.mjs` 1,599.73 kB；产物写入临时目录，没有覆盖仓库 dist 或同步 Studio。
- 临时探针：复现编辑器字段丢失、注册/注销顺序错误、导航监听器中断、关闭锁异常和关闭后重新等待的行为。
- 文档导出核对：main 55 个命名导出、plugin 80 个命名导出均出现在 SDK README；main default 也有说明。此检查仅证明名称覆盖，不等同于所有示例编译或每个 API 的宿主行为验证。
- 未完成的验证：独立干净工程安装构建、实际 Studio 渲染/交互、并行 Preview、安装包同步、发布包验证。

失败测试均为 HUD schema 断言滞后：

1. `phone-content-items.test.ts:19`：期待 19 个字段，实际 32。
2. `phone-host-editor-schema.test.ts:22`：期待 19 个字段，实际 32。
3. `phone-host-editor-schema.test.ts:74`：期待 6 个 HUD 字段，实际 19。

这些失败可以确认测试与当前 schema 不一致，不能单凭计数判定新字段本身错误。检查开始时这两份测试和 register.test.ts 已在工作区显示为修改，本次未改动。

### 复查命令

已安装 CLI 依赖且 Node 在 PATH 时，在仓库根目录：

```powershell
$auditTests = @(rg --files phone-sdk src -g '*.test.ts')
node --import ./cli/node_modules/tsx/dist/loader.mjs --test @auditTests
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/vite/bin/vite.js build --outDir "$env:TEMP\phone-sdk-audit-build"
```

在 cli/ 下：

```powershell
$cliTests = @(rg --files src -g '*.test.ts')
node --import ./node_modules/tsx/dist/loader.mjs --test @cliTests
```

首次沙箱运行出现 pnpm 链接文件读取 EPERM、tsx 的 uv_os_get_passwd ENOMEM；随后在获准的沙箱外运行得到上述有效结果。这些首次启动错误不计为业务测试失败。

## 2. 确认的问题

优先级含义：P1 为影响独立接入或可使交互流程失效的问题；P2 为接口不一致、测试和文档缺口。下列“探针复现”仅指独立 Node 进程的 SDK 行为，并非游戏 UI 复现。

### P1：发布包依赖声明不完整（已在发布准备中补齐，见第 7 节）

证据：[phone-sdk/package.json](./package.json)、[theme-provider.tsx](./src/host/editor/theme/theme-provider.tsx)、[chakra-elements.tsx](./src/host/editor/shared/chakra-elements.tsx)、[enum-select.tsx](./src/host/editor/shared/enum-select.tsx)。

main 导出的编辑器组件直接依赖 `@chakra-ui/react` 和 `react-dom`。SDK 清单仅声明 react / Studio SDK peers，没有声明 Chakra 或 React DOM；本仓根 package.json 提供了它们，CLI 创建的新宿主模板没有 Chakra。独立工程不能依赖本仓偶然提供的包。

结论依据为源码/manifest 比对；尚未在干净安装环境复现失败。建议声明正确依赖/peers，核对 Chakra 安装约束，并增加隔离安装构建验收。文档已说明当前接入要求。

### P1：宿主未安装时，最后一次注册可能被旧注销覆盖

证据：[register.ts](./src/client/runtime/register.ts)、[host.ts](./src/client/runtime/host.ts)。

探针执行：register(probe) → unregister(probe) → register(probe) → installPhoneSdkHost。最终应用列表为 `[]`。

原因：最后一次 register 未清除 unregisterQueue 中的同 ID；安装先刷注册队列，再刷注销队列。应以最后一次操作为准，或在重新注册时移除待注销项。现有测试没有覆盖此顺序。

### P1：关闭锁订阅者抛异常后，调用方拿不到释放函数

证据：[phone-close-lock.ts](./src/client/runtime/phone-close-lock.ts)。

探针先订阅一个抛异常的回调，再 acquirePhoneCloseLock。结果：函数抛出、locked 为 true、releaseReturned 为 false。锁已经写入全局槽位，但获取过程尚未返回，普通关闭可能持续被拦截。

建议逐监听器隔离异常，保证获取/释放函数返回和清理；补充获取、释放、强制清锁三条异常路径。注册表与角标通知已有异常隔离，可以复用其约定。

### P2：编辑器类型声明与注册规范化不同步

证据：[types.ts](./src/client/runtime/types.ts)、[register.ts](./src/client/runtime/register.ts)、[phone-property-panel.tsx](./src/host/editor/phone/phone-property-panel.tsx)、[use-schema-editor-panes.tsx](./src/host/editor/schema/use-schema-editor-panes.tsx)。

类型允许 `fieldType: "character"` 与 `preview: "phone-call"`，属性面板和预览组件也有相应分支，注册规范化的白名单却没有它们。

探针输入角色字段与电话预览页面，队列里只剩 `{ enabled: true, pages: [{ id: "call", label: "call" }] }`：contentItems 与 preview 均丢失。

当前电话 APP 使用 [自定义三栏](../src/phone-call/editor-panes.tsx) 提供预览，因此不能直接推断本仓电话编辑器无法显示；明确受影响的是 SDK 通用注册契约和未提供 custom panes 的应用。建议统一类型、规范化、通用渲染及测试。

### P2：导航监听器异常阻断后续监听器

证据：[phone-nav-bus.ts](./src/client/runtime/phone-nav-bus.ts)。

探针的第一个订阅者抛异常后，publishPhoneNavigate 抛出，后续监听器未收到请求。宿主导航在 ui.show 前发布请求，此异常可能让 openPhoneApp 直接 reject，而非返回其声明的结果值。

subscribe 的 pending 回放也同步调用 listener；回放抛异常时取消订阅函数尚未返回。建议通知和回放都有异常隔离，并定义错误返回契约。

### P2：完整程序路径不能隔离不同扩展的同名应用

证据：[app-id.ts](./src/client/runtime/app-id.ts)、[register.ts](./src/client/runtime/register.ts)、[install-host.ts](./src/host/phone/runtime/install-host.ts)。

路径会规约为程序 ID，全局 Map 仅按程序 ID 索引。`a.extension/shop` 与 `b.extension/shop` 都对应 shop。当前覆盖是实现约定，但原文档未明确指出完整路径不具有隔离作用。

文档已明确这一限制；若将来承诺多第三方同名程序，应改造命名空间和查找协议，不能只改说明或前端输入格式。

### P2：公开类型导出缺少 OpenPhoneAppPosition

该类型在 types.ts 定义，但 main/plugin 均未单独导出。OpenPhoneAppOptions.position 可以使用，不属于参数功能失效；开发者无法直接从公开入口导入其命名类型。文档提供 indexed-access 类型写法，建议补齐命名导出与入口测试。

## 3. 源码确认的生命周期缺口（需宿主验证）

### 宿主/导航卸载未成对

[PhoneExtension.onRegister](./src/host/phone/extension/phone-extension.tsx) 调用 installPhoneExtensionSdkHost 时丢弃返回的 dispose；abort cleanup 只释放输入/settings 订阅。bindPhoneNavigationController 把带 ctx 闭包的导航写入全局槽位，没有对应卸载函数。

因此流程 abort 后没有看到清除 host/navigation 的对称路径。globalThis 中可能继续持有过期 ctx；多 Preview 后注册的控制器也会覆盖先注册的控制器。实际是否触发错误受 Studio 模块隔离方式影响，尚未运行真实宿主验证。

建议为 host 和 navigation 保留所有权令牌，卸载时仅清除属于自身的绑定；补充“旧 Preview abort 不影响新 Preview”和卸载后 API unavailable 的测试。

### 动画关闭 Promise 与异步 UI 隐藏没有完整对齐

[closeWithAnimation](./src/host/phone/ui/phone-ui-content.tsx) 在计时器调用 void closePhone 回调后立即 resolve；[render.closePhone](./src/host/phone/extension/phone-extension.tsx) 通过 void hidePhoneUi(...).finally(emitPhoneClosed) 异步隐藏。

这与 PhoneNavigationController 注释宣称的“容器释放后 resolve”不完全一致。组件卸载 cleanup 清除 closeTimer，没有保存并调用 Promise 的 resolver，动画中途卸载可能使 closePhoneApp 的等待无法结束。

建议将关闭回调变成可等待的完成操作，卸载时统一 settle。文档已说明当前限制；实际动画中途卸载需要 Studio 验证。

### unmount-phone 与导航等待没有统一收尾

deactivatePhoneRuntime 关闭 UI、释放剧情消息序列，但没有直接 emitPhoneClosed；UI 的卸载 cleanup 也没有该通知。由 unmount-phone 隐藏手机的路径，不能从源码保证释放另一条 openPhoneApp 的 close waiter；flow abort 另有取消机制。

建议关闭按钮、无动画关闭、卸载、异常销毁、skip/seek 和 flow abort 共用可验证的收尾约定。

### 返回结果不代表内页准备完成

openPhoneApp 的客户端只判空；宿主不等待应用注册查找/内页渲染确认。none 模式立即返回 opened，即使稍后异步 show 失败；close 模式的 abort 也按 opened 收尾。该行为可用于调度，但不能作为内页成功或业务交互成功的证明。

建议定义 opened 的准确含义；如需要业务确认，增加会话完成/失败/取消协议。文档已按当前实现说明。

## 4. 脚手架与文档

### 模板缺少完整宿主模块

default/minimal 的 src/index.tsx 均仅导出 PhoneExtension、ToastExtension。实际本仓入口另外导出 PhoneHudExtension、PhoneEditorExtension。构建成功或模板文件存在测试不能证明新建宿主的 HUD/编辑器可用。

建议补齐模板导出或明确模板能力裁剪，并在生成后验证模块列表及构建。

### 原有文档缺失/漂移

- phone-sdk README 缺少完整宿主搭建、四模块作用、导航参数/结果、payload 消费、锁与卸载、编辑器 schema 总体说明及公开 API 清单。
- src/README.md 顶部推荐 ^0.5.5，正文多处仍为 ^0.5.0，与仓库 0.5.26 和 CLI 本地解析行为不同。
- cli/README.md 文件中存在中文乱码，UTF-8 读取和 rg 均可见，且版本叙述仍为 ^0.5.0。需要从可靠原文恢复，不宜直接猜测编码重写。
- waitForPhoneClosed / emitPhoneClosed 的 JSDoc 称关闭事件后新 wait 立即完成，但探针得到 completed=false、waiters=1。实现实际等待下一次 emit。
- README 中不同阶段的 npm 发布状态叙述不一致。本次没有网络核实，不据此断言某版本已发布。
- Vite 配置注释曾建议第三方将 phone-sdk external，实际 pack 模板和开发说明均采用打进 bundle。应统一源码注释与文档。

本次整理将宿主 API、接入、等待与生命周期限制补进 [SDK README](./README.md)，并在开发文档建立入口。历史版本记录与 CLI 乱码恢复未作为代码修复处理。

本报告 AUDIT.md 属于仓库检查记录；当前 phone-sdk/package.json 的发布 files 只包括 src 和 README.md，不会随 npm 包发布本报告。

## 5. 完整性分项判断

| 方面 | 当前判断 | 依据 |
| --- | --- | --- |
| 宿主核心能力 | 较完整 | 四模块、桌面/动作、消息、shared 存档、输入与 HUD 已实现 |
| 内页接入 | 基本完整，有边界缺陷 | 注册、导航、props、payload、角标、安全区齐全；队列顺序有误 |
| 作者编辑器 | 功能较多，契约不一致 | schema/custom panes/素材控件具备；两种声明值被过滤 |
| 异常与卸载 | 不完善 | 锁/导航监听器问题已复现；绑定及动画 Promise 清理不足 |
| 独立发布/脚手架 | 不完善 | SDK 缺依赖声明；模板漏模块；尚无隔离安装证明 |
| 测试门禁 | 不完善 | 3 项失败，类型检查阻塞；CLI 测试未覆盖完整生成构建 |
| 文档 | 本次已补宿主参考，仍需维护 | 主 SDK 接入/API/限制已整理；CLI 乱码、源码 JSDoc 和版本事实仍需处理 |
| 实际 Studio 验证 | 未验证 | 本次未启动/重载 Studio 或修改安装目录 |

## 6. 建议完善顺序

1. 修正依赖/模板，建立仅声明工程依赖的隔离宿主构建。
2. 修正注册队列时序、锁/导航监听器隔离及宿主绑定清理。
3. 对齐关闭完成、卸载/abort 以及 UI 动画中途销毁的等待契约。
4. 统一 schema 类型/规范化，补齐公开类型导出；更新 HUD 测试的有效断言。
5. 从官方来源同步完整 Studio SDK 合同，恢复类型检查门禁。
6. 恢复 CLI 中文文档，核实发布版本；以入口导出和示例编译建立文档检查。
7. 在真实剧本 Preview 验证鼠标/触屏/键盘、返回桌面、关闭锁、聊天/来电、skip/seek、卸载与多 Preview。

首次检查仅整理文档和检查结果，未修改运行时、模板、SDK 合同或既有测试，未同步、提交、推送、发布。

## 7. 0.5.26 发布准备复查（2026-09-27）

- npm 官方源发布前核实：`latest` 为 0.5.5，0.5.26 尚未发布。
- 已修正包清单：Chakra UI / Emotion 为普通依赖，React DOM 为 peer dependency；继续使用 React 18 / Studio SDK peers。发布包排除 `*.test.ts`，包含源码和 README。
- HUD 测试已按现有 schema 更新，检查字段唯一性、内容引用、按钮类型显示条件、自定义样式条件及数字边界。重新扫描并执行 `phone-sdk/` 与 `src/`：**203 项全部通过**。
- 根宿主 Vite 构建通过：2118 个模块，产物写入临时目录。
- 使用打出的 `.tgz` 在临时独立工程安装并构建通过：2054 个模块。该工程只显式声明 phone-sdk、React、React DOM、Studio SDK 和 Vite 构建工具，没有直接声明 Chakra / Emotion；入口导出完整宿主四模块并从 `/plugin` 注册内页，验证发布包提供编辑器依赖。
- 隔离工程的 Studio SDK 使用本仓合同副本，构建将它作为 external；该结果证明安装和打包可用，不证明目标 Studio 合同完整或真实交互成功。
- TypeScript 仍失败：`sdk/index.ts:22` 缺少 `./extension-inspector`（TS2307）。未改动 Studio SDK 合同副本。
- 注册时序、监听器异常、schema 规范化、卸载/关闭等待及 CLI 模板问题仍未修复。没有执行真实 Studio Preview、同步、重启、Git 提交或推送。

### npm 发布结果

- 2026-09-27：发布 `@ink-zenly/phone-sdk@0.5.26` 成功，public 访问，官方源 `latest` 为 0.5.26。版本生命周期接口也返回 `published`。
- 最终包包含 110 个文件；除 README 的版本说明更新外，109 个源码/清单文件与隔离构建使用的包逐文件一致。
- 官方源元数据的 `dist.integrity` 和重新下载的 tarball 均与本地发布包一致：

```text
sha512-GtqB4qbGVQQjh0nxuoO2O/bsiuSCpLBGTfsaF2qSepSSW1Armsb/gAqAPdKmkP17zJS2mGWDMsdx9DwsbzvhfQ==
```

- [npm 0.5.26](https://www.npmjs.com/package/@ink-zenly/phone-sdk/v/0.5.26)。CLI 未发布；未进行 Git 提交、推送或 Studio 同步。以上测试、构建与 registry 结果仅对应本次复查。
