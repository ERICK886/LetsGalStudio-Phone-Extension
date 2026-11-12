# Phone SDK 0.7.0 / CLI 0.4.1 发布记录

日期：2026-11-13（北京时间）。

## 版本与范围

- SDK 0.6.0 → 0.7.0：复用手机本体实现常驻停靠，首次刷新直接定位到对应视口边缘；展开/收回保留同一实例和内页；捕获原生 mousedown，外侧完整点击仅收回手机；移除首页关闭按钮。
- CLI 0.4.0 → 0.4.1：新工程默认 SDK 范围更新为 `^0.7.0`，继续提供 create/add/doctor/build/pack。
- 保留现有扩展 ID、程序 ID、设置与存档归属；旧按钮外观字段不再参与 HUD 渲染，历史字段值不删除。手机完整扩展仍为 1.3.5。
- 按用户要求清理低价值测试：删除电话按钮源码正则测试、相册编辑器标签正则测试、模板固定文件清单测试；移除电话卡片的源码命名匹配断言。保留真实模板生成、注册/导航/关闭、设置/存档隔离、业务行为和打包测试。
- 浏览器 APP 仍仅保留设计文档，本次不包含实现。

## 发布前验证

- SDK/软件 245 项测试、CLI 40 项测试通过。
- 根工程及 CLI TypeScript 检查通过。
- SDK tarball 126 个文件，CLI tarball 81 个文件；未包含测试、node_modules、环境配置或 npm 凭据。
- 在仓库外使用实际 SDK/CLI tarball 完成宿主、独立软件的安装、构建和 doctor 检查；两种工程均无错误或警告。

## npm 与发布后验证

两个版本均已在 npm 官方源公开，latest 与 dist.integrity 核验一致，重新下载的 tarball SHA-256 与本地测试产物完全一致。

| 包 | 版本 | 官方发布时间（北京时间） |
| --- | --- | --- |
| [Phone SDK](https://www.npmjs.com/package/@ink-zenly/phone-sdk/v/0.7.0) | 0.7.0 | 2026-11-13 00:11:49 |
| [CLI](https://www.npmjs.com/package/@ink-zenly/create-phone-app/v/0.4.1) | 0.4.1 | 2026-11-13 00:14:23 |

发布后从 npm 安装 CLI 0.4.1，实际执行其 bin，生成工程均使用 `^0.7.0`，未用本仓 SDK 源码替代。四类工程均成功安装、构建并通过 `doctor --release`，无错误或警告。

| 工程 | 已验证流程 |
| --- | --- |
| default 宿主 | create、add 第二个软件、npm install、build、doctor --release |
| minimal 宿主 | create、npm install、build、doctor --release |
| 独立软件 | create --kind plugin、npm install、build、doctor --release |
| 拆包工程 | pack --prepare、npm install、pack --skipInstall、doctor --release |

根工程 CLI 依赖及 pnpm 锁文件对齐 0.4.1，冻结离线校验通过；保留原有 Rollup libc 平台元数据，没有重装根工程依赖。验证产物保存在 `release/npm-20261113/`，隔离工程保存在 `../.phone-npm-20261113/`。

本次仅发布 npm SDK/CLI，不发布 Studio 或完整手机扩展，不创建 Git tag。此前实机验证确认停靠展开和内页保留；最新外侧点击修复的实机验收被用户按 Esc 中止，自动化行为验证通过，未将其记为实机通过。
