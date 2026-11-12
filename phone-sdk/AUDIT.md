# 手机宿主 SDK 完整性检查

检查日期：2026-09-27。范围：本仓 `phone-sdk/`、扩展入口、构建配置、CLI 宿主模板和相关 README。SDK 仓库版本 0.5.26；扩展版本 1.3.2；CLI 版本 0.3.7。以下第 1–6 节保留首次检查快照；后续发布准备的复查见第 7 节，2026-09-30 工作区修复见第 8 节，0.5.27 发布验证见第 9 节，CLI 0.3.8 发布验证见第 10 节。未运行真实 Studio Preview。

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


## 8. 2026-09-30 工作区修复（未发布）

本节覆盖当前源码，前文缺陷和计数为历史快照，不代表本节修复后的状态。扩展、SDK 和 CLI 版本号均未修改。

- 注册顺序：重新注册清除同 ID 的待注销项；引导回调按归属共存，支持同归属热重载替换与幂等清理。
- 异常隔离：导航发布/回放及关闭锁通知逐监听器捕获异常，获取锁仍能返回释放句柄。
- 关闭生命周期：控制器与 Studio 适配分离；显示失败清理其 waiter，先订阅再显示；动画关闭等待隐藏完成，中途卸载结束动画等待；unmount-phone 发送关闭通知。隐藏失败不再伪装成成功关闭。
- 绑定所有权：标准宿主保存并释放 host/navigation 的 disposer；旧绑定不会删除新绑定。导航序号跨 bundle 共享，关闭通知按 flow.signal 归属清理，避免旧会话误清新 pending 或唤醒新 waiter。
- 聊天数据：存档、设置缓存、消息总线与回复等待按 Preview 的 flow.signal 隔离，并通过全局槽跨 bundle 共享；方法、UI 和卸载路径同步接入。绑定 save 只读，不回灌旧内存；存档字段格式不变。
- 编辑器：保留 character 和 phone-call 声明；允许无标量字段的自定义面板；聊天 schema 采用应用注册值，旧内置页面适配器只在所属分区生效，自定义面板优先。已有聊天编辑器导出保留兼容，未拆成独立包。
- 公开入口和模板：公开 OpenPhoneAppPosition；default/minimal 均导出宿主四模块，并传入稳定的 bootstrap 归属。

验证：SDK/内页扫描 52 个测试文件，223 项通过；CLI 扫描 11 个测试文件，38 项通过。根工程 pnpm run build 通过。使用当前 SDK tarball 分别生成 default/minimal 临时宿主，以自身 package.json 离线安装依赖后构建通过；未使用仓库 node_modules 链接替代安装。TypeScript 仍只有 sdk/index.ts:22 缺少 ./extension-inspector 的 TS2307，未改动合同副本。

限制：未执行真实 Studio 剧本 Preview，快捷键/触屏/skip/seek/暂停恢复仍需实际验证。全局 SDK 桥仍是单活动导航宿主；角标、关闭锁等未升级为完整多宿主协议，第三方应用 ID 仍需全局唯一。未同步、重启、提交、推送或发布。

## 9. 0.5.27 发布验证（2026-10-14）

- SDK 从 0.5.26 升为 0.5.27，包含第 8 节 SDK 修复及 Android WebView 默认触摸高亮调整。扩展清单与根 package.json 同步升为 1.3.4；SDK 发布时 CLI 仍为 0.3.7；随后按用户确认的范围追加 CLI 0.3.8 发布，见第 10 节。
- 本次发布前已验证提交 37a8adf 的 SDK/内页 52 个测试文件、223 项测试及 CLI 11 个测试文件、38 项测试全部通过。此次仅更新版本和说明，未再次修改运行时代码。
- 插件 1.3.4 的根 Vite 构建通过。SDK 0.5.27 tarball 在新建 default/minimal 宿主中分别离线安装和构建通过；生成的 SDK 范围为 ^0.5.27，验证时替换为待发布 tarball，不借用仓库 node_modules。
- tarball 共 115 个文件、207208 字节；公开入口与新增运行时文件齐全，未打入测试文件。依赖与 peerDependencies 保持原发布契约。
- TypeScript 已在同一会话中对照待发布源码与原 HEAD：均只有 sdk/index.ts:22 缺少 ./extension-inspector 的 TS2307。未改动 Studio SDK 合同，不能视为完整类型检查通过。
- npm 官方源已可查询 0.5.27，latest 标签为 0.5.27；发布时刻为 2026-10-14 14:35:18（北京时间）。registry 的 dist.integrity 与重新下载的官方 tarball 均匹配本次验证产物。

已发布 tarball 的 SHA-512：

```text
sha512-X104mOTftV074/F1ffRP4l5mkhuN4koPlE6TMz0bIVHrcZfdoYVy10Q7QDFjjBw6qO7cuWzQX7Gwx0SsmmvpZw==
```

发布页：[npm 0.5.27](https://www.npmjs.com/package/@ink-zenly/phone-sdk/v/0.5.27)。限制：未执行真实 Studio 剧本 Preview，未同步或重启 Studio。

## 10. CLI 0.3.8 发布验证（2026-10-14）

- CLI 升为 0.3.8，独立安装的 SDK 版本兜底从 ^0.5.5 更新为 ^0.5.27；包含第 8 节 default/minimal 完整宿主导出和 bootstrap 归属修复。扩展维持本次已升级的 1.3.4，SDK 0.5.27 不重复发布。
- 命令行 --version 和帮助页统一从 package.json 读取版本，消除固定输出 0.3.2 的问题。发布 files 明确排除测试文件；README 从最后可读的 Git 原文 3f9fbfb 恢复，再按当前入口更新版本、参数和独立运行说明。
- CLI 扫描 11 个测试文件，38 项全部通过。TypeScript 使用 cli/tsconfig.json 并显式允许源码已有的 .ts 导入后缀：当前有 4 项错误，原 HEAD 有 5 项；本次没有新增诊断，并消除了旧版本读取处的 TS2339。剩余为三处 citty showUsage 泛型不匹配 TS2345，以及 template.test.ts 的 TS2554；不能视为完整类型检查通过。
- 待发布 tarball 在独立临时项目中安装；实际 bin 的 --version、四类 --help 均成功，非法 app-id 返回 1 且没有创建目标目录。没有借用仓库 node_modules。
- 通过已安装 CLI 分别生成 default/minimal，依赖范围均为 ^0.5.27，四个宿主导出和捆绑 SDK 均存在；从 npm 官方源安装的实际 SDK 均为 0.5.27。default 添加第二个内页后构建通过，minimal 构建通过；pack 从 default 抽离第二个内页后，自行安装、构建并生成 dist/index.mjs，包 ID 与程序 ID 分别核对通过。
- 根项目 CLI 依赖和 pnpm 锁文件已更新为 0.3.8，冻结锁文件校验通过；依赖版本与已发布 integrity 一致，其他包版本及平台元数据保留。根 node_modules 未重装，独立工程安装验证见上。
- 发布产物含 69 个文件、66469 字节；bin、模板、vendor 合同和运行依赖齐全，无测试文件。npm 官方源已可查询 0.3.8，latest 为 0.3.8，发布时间为 2026-10-14 15:28:57（北京时间）；registry dist.integrity 与重新下载的官方 tarball 均匹配验证产物。

限制：没有执行真实 Studio 剧本 Preview，也没有同步或重启 Studio。第 9 节根工程类型检查限制仍存在。

已发布 CLI tarball 的 SHA-512：

```text
sha512-WpNzltyC2aWiI/bhefHEaJ1pE+2isVgRUFCZUImq1FwCm9kz6MJW/JE6BQq0BuKUBvoAQ1IAO4Lselh24OH21g==
```

发布页：[CLI npm 0.3.8](https://www.npmjs.com/package/@ink-zenly/create-phone-app/v/0.3.8)。本节仅更新已发布 SDK 的仓库说明，未改动 SDK 运行时代码或重发 0.5.27。

## 11. 手机聊天与后续运行周期修复（2026-10-23，未发布）

针对重复记录、特定场景比例错误、会话无法再次进入及后续章节不记录四项反馈，沿宿主与聊天 APP 两条路径检查并修复。以下结论限于本次工作区源码与验证，版本号未修改。

- 重复记录：恢复存档时，聊天方法读取宿主 `flow.isRestoring`，保留已恢复的记录、待回复和变量结果，不再重放追加消息或回复效果；普通 skip/即时执行仍保留原有写入语义，相同文字的正常发送不会被误去重。私聊和群聊均覆盖。
- 比例错误：手机根容器改为相对 Studio UI Host 画布定位，避免无 transform 的宿主中误用浏览器视口；可用宽高为零时保持收缩，宽高使用同一比例。
- 再次打开：未配置为好友但已有来信的会话保留在聊天列表，支持返回后再次进入；显式移除好友仍隐藏。剧情消息不再等待可能直到关闭才完成的 `ui.show()`，关闭等待实际隐藏后才放行下一组，避免旧关闭操作关掉新内容。
- 后续周期：新增 `registerPhoneRuntimeCycle`，在同一引擎的 signal 更新后重新安装宿主导航及聊天设置订阅。聊天重新绑定实时 SaveAPI，UI 在存档变量变化时刷新；旧周期的回复等待、延迟关闭及卸载只清理自身资源，abort 结束剧情消息等待。

验证记录：

- 扫描 `phone-sdk/`、`src/` 下 55 个 `*.test.ts` 文件，232 项全部通过。新增回归覆盖恢复重放、回复变量效果、跨周期存档、导航重装、延迟关闭中止和连续剧情消息。
- 使用已安装 Chromium/React 执行真实组件的浏览器 DOM 检查：未加好友会话连续返回并进入 3 次，每次仅有一份消息；600×500、240×320、700×900 宿主容器下均保持比例且不越界，剧情消息模式可显示，无浏览器控制台错误。该检查使用模拟 SDK 上下文，不是 Studio 剧本 Preview。
- 根工程 `pnpm run build` 通过；`git diff --check` 通过。
- TypeScript 仍只有既有的 `sdk/index.ts:22` 缺少 `./extension-inspector`（TS2307），未修改 SDK 合同副本来规避错误。

边界：恢复去重依赖宿主提供 `flow.isRestoring`，已核对本地 light-engine 源码的实现；未确认用户正在运行的 Studio 是否包含该能力，旧宿主保持原执行语义。`show-message` 仍是原有的临时剧情展示，持久聊天记录由聊天 APP 模块管理。本次未在真实 Studio 中复现和验收具体剧本，未同步、重载、重启、提交、推送或发布。

## 12. 版本号统一更新（2026-10-23，待发布）

- 手机扩展从 1.3.4 升为 1.3.5，根 package.json 与 extension.json 一致；聊天、相册、电话及宿主模块共用该扩展包版本。
- Phone SDK 从 0.5.27 升为 0.5.28，包含第 11 节宿主修复与 registerPhoneRuntimeCycle；公开入口的版本注释同步更新。
- CLI 从 0.3.8 升为 0.3.9，SDK 依赖兜底从 `^0.5.27` 更新为 `^0.5.28`。根工程 CLI 依赖改为 `file:cli`，与已使用本仓 CLI 的脚本保持一致，避免依赖尚未发布的 npm 版本。
- 当前版本说明、安装示例与更新日志同步更新，并标记待发布。历史发布记录、第三方依赖版本、Studio SDK 合同副本及脚手架新项目的初始版本 0.1.0 保留。

验证：CLI 扫描 11 个测试文件，38 项通过；命令行 `--version` 输出 0.3.9。Phone SDK / CLI 本地打包分别包含 116 / 69 个文件，测试文件均未入包，新增 runtime-cycle 源码在 SDK 包内。解包后的独立 CLI 版本解析返回 `^0.5.28`；本仓 CLI 实际生成的 default/minimal 工程也声明 `^0.5.28`，清单与 package.json 的初始版本一致。

根锁文件由 pnpm 离线生成，并保留无关的 Rollup 平台元数据；冻结锁文件检查通过。未重装当前工作区 node_modules。扩展 1.3.5 根构建通过，git diff --check 通过。本次仅更新版本元数据、依赖引用和文档，SDK/内页功能测试沿用第 11 节的 232 项通过记录；此前类型检查的 extension-inspector 缺失问题仍未处理。

独立安装限制：曾尝试在临时工程安装本次 CLI tarball，但本地 store 缺少 `@clack/prompts@0.10.1`，联网重试又因 `registry.npmjs.org` 的 DNS 解析失败而中止。因此本次未完成独立工程安装与构建，包内容检查和根构建不能替代该项验证。

宿主兼容复核：只读检查 `E:/light-engine`，确认 SDK 公开且运行时实现 `flow.isRestoring`、`runtime:started` 和 `variable:changed`，执行相关 5 个测试文件，82 项通过；不据此断言用户已安装 Studio 的版本。未修改 LGS 源码或主进程，未同步、重启、提交、推送或发布。

## 13. SDK 0.5.28 / CLI 0.3.9 发布验证（2026-10-23）

本节记录用户授权后的实际 npm 发布结果，更新第 11、12 节当时未发布及独立安装未完成的状态。手机扩展 1.3.5 由用户自主发布，本次没有发布手机扩展。

- 发布前重新执行 SDK / 内页 55 个测试文件，232 项全部通过；CLI 11 个测试文件，38 项全部通过。
- SDK tarball 包含 116 个文件、208975 字节，包含新增 runtime-cycle 源码；CLI tarball 包含 69 个文件、66487 字节。两者均不包含测试文件，CLI bin 的 shebang 使用 LF，发布清单及依赖声明已核对。
- 在独立临时工程安装本次 CLI tarball，实际 bin 的版本、四类帮助页及非法 app-id 拒绝路径通过。使用安装后的 CLI 创建 default/minimal 宿主，并向 default 添加第二个内页；生成依赖范围均为 `^0.5.28`。为发布前验证，将测试工程的 SDK 依赖替换为本次 SDK tarball，分别安装自身依赖并构建成功，未借用根工程 node_modules。
- SDK 公开后，使用上述 CLI 的 `pack` 从 default 抽离第二个内页；生成工程直接从 npm 安装 SDK 0.5.28 并构建成功，生成 `dist/index.mjs`，扩展包 ID 与程序 ID 分别核对一致。
- 根工程 CLI 依赖从临时的 `file:cli` 恢复为已发布的 0.3.9；锁文件由 pnpm 生成，integrity 与官方包一致，保留原有 Rollup 平台元数据，冻结锁文件离线校验通过。未重装根工程 node_modules；本仓脚手架命令继续运行 `cli/` 源码。
- npm 官方源 `latest` 已分别为 SDK 0.5.28 和 CLI 0.3.9；两个版本的 `dist.integrity` 及重新下载的官方 tarball 均与本地发布包一致。北京时间发布时间：SDK 为 2026-10-23 17:51:50，CLI 为 2026-10-23 17:59:06。

已发布包的 SHA-512：

```text
@ink-zenly/phone-sdk@0.5.28
sha512-eromQC36VayCwYfku87q6PiK0LOuM2SQeiP+O4E94iZGZa52qC/zVOzqzg7KHDuupxEPqw1uq3GtZ/JybXSFSA==

@ink-zenly/create-phone-app@0.3.9
sha512-+ZJnEoOAtOIIMNXGiRdPcVEptJsh6J5nHqkbg737INr5UoUqchksXlYJhXr5IPY+46ihyvv0o8SsnU52G7ejyg==
```

发布页：[SDK npm 0.5.28](https://www.npmjs.com/package/@ink-zenly/phone-sdk/v/0.5.28)、[CLI npm 0.3.9](https://www.npmjs.com/package/@ink-zenly/create-phone-app/v/0.3.9)。本地发布包与校验记录保留于 `release/npm-20261023/`。

类型检查限制仍存在：根工程 `sdk/index.ts:22` 缺少 `./extension-inspector`（TS2307）；CLI 显式允许源码 `.ts` 导入后缀后，仍有 `src/index.ts:228/230/232` 三处 citty showUsage 泛型不匹配（TS2345）和 `src/utils/template.test.ts:82` 参数个数错误（TS2554）。这些与既有诊断一致，未修改 Studio SDK 合同或绕过类型检查。此前根构建通过；独立工程构建和 npm 下载校验不能替代真实 Studio 剧本验收。本次未同步、重启 Studio，未 Git 提交或推送。


## 2026-11-12 工作区结构调整

已增补宿主/插件/编辑器公开入口、带来源的注册解析与清理、独立软件设置桥，以及 CLI 项目/软件描述协议。旧根入口、程序 ID 和持久化定义保持兼容。

本次执行记录见 [结构调整验证记录](../architecture/phone-structure-validation.md)：SDK/软件测试 240 项、CLI 测试 40 项通过，实际 tarball 隔离安装与六类工程构建通过。根完整类型检查仍受既有 `sdk/extension-inspector` 缺失阻塞；未进行新代码的真实 Studio 验收，未发布。
