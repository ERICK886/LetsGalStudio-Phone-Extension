# Phone SDK 0.6.0 / CLI 0.4.0 发布记录

日期：2026-11-12（北京时间）。

## 版本和范围

- `@ink-zenly/phone-sdk`：0.5.28 → 0.6.0，包含结构调整后的 `/host`、`/plugin`、`/editor`、来源解析、统一注册和软件设置桥。
- `@ink-zenly/create-phone-app`：0.3.9 → 0.4.0，默认 SDK 范围为 `^0.6.0`，包含 create/add/doctor/build/pack 和工程清单。
- 发布准备时补充修复：已安装 CLI 不再把同 scope 下相邻的 npm SDK 包误认成开发源码；生成的依赖保持 npm 版本范围。新增 3 项回归测试。
- 手机扩展本身保持 1.3.5；未修改扩展包 ID、程序 ID、设置或存档定义。

## 发布前证据

- CLI 43 项测试及 CLI TypeScript 检查通过。
- SDK 业务代码保持本轮已通过的 240 项测试基线；本轮结构验证记录见 [phone-structure-validation.md](phone-structure-validation.md)。
- SDK / CLI tarball 分别包含 124 / 81 个文件；所有公开入口存在，测试文件未入包，接入文档随包发布。
- 使用本次 CLI tarball 和 SDK tarball，在仓库外的隔离目录完成 default/minimal 宿主、独立软件模板及 pack 拆包工程的安装与构建。
- 实际执行 create/add/doctor/build/pack，独立软件包保留真实控制器。

本地产物及哈希记录：`release/npm-20261112/`。隔离工程：`../.phone-npm-20261112/`。

## npm 状态

两个版本已正式发布到 npm 官方源，`latest` 均已指向本次版本。

| 包 | npm 版本 | 发布时间（北京时间） |
| --- | --- | --- |
| [Phone SDK](https://www.npmjs.com/package/@ink-zenly/phone-sdk/v/0.6.0) | 0.6.0 | 2026-11-12 18:14:23 |
| [CLI](https://www.npmjs.com/package/@ink-zenly/create-phone-app/v/0.4.0) | 0.4.0 | 2026-11-12 18:18:19 |

SDK 先公开，CLI 随后发布。两者的官方 `dist.integrity` 与本地发布包一致；重新从 npm 下载的 tarball SHA-256 / SHA-512 也完全一致。

## 发布后安装与构建

从 npm 安装 CLI `0.4.0`，通过其实际 bin 执行命令。生成工程的 SDK 依赖自动为 `^0.6.0`，未用本地源码替代；各工程锁文件均确认 SDK 解析至官方 `phone-sdk-0.6.0.tgz`。

| 工程 | 验证内容 | 结果 |
| --- | --- | --- |
| `public-default` | default 宿主、add 第二个软件、安装、build、doctor --release | 通过 |
| `public-minimal` | 从同时安装 CLI/SDK 的工程生成 minimal 宿主，确认依赖未变成 file 路径，安装、build、doctor --release | 通过 |
| `public-plugin` | 独立软件模板、安装、build、doctor --release | 通过 |
| `public-packed` | 从 default 拆出软件、安装、pack --skipInstall 构建、doctor --release | 通过 |

四个工程的 `doctor --release` 均无错误或警告。发布后的 SDK 还单独完成一个全新宿主的官方源安装与构建。

根工程 CLI 依赖与 pnpm 锁文件已对齐 0.4.0；保留既有 Rollup 平台元数据，冻结锁文件离线检查通过。没有重装根工程依赖。完整证据保存在 `release/npm-20261112/verification.json`，构建日志位于隔离工程目录。

## 验证边界

本次未同步 Studio、未启动新实例、未发布完整手机扩展、未创建 Git tag；发布相关源码改动尚未提交或推送。真实 Studio UI、读档、聊天与电话交互仍待验收。根完整类型检查的既有 `sdk/extension-inspector` 缺失项保持原结论，不计为类型检查通过。
