# 手机结构调整验证记录

日期：2026-11-12。此记录仅对应本次工作区源码，不表示 npm 或工坊已发布。

## 已执行

| 层级 | 结果 |
| --- | --- |
| SDK + 三个软件的 `*.test.ts` | 240 项通过，覆盖注册/来源、队列、HMR、上下文设置桥、导航与已有业务回归 |
| CLI `src/**/*.test.ts` | 40 项通过，覆盖生成、添加、注册注入、打包保留控制器和输出保护 |
| CLI TypeScript | `tsc -p cli/tsconfig.json --noEmit` 通过 |
| CLI lockfile | 离线 `--frozen-lockfile --lockfile-only` 校验通过；TypeScript 从开发依赖调整为 CLI 运行依赖 |
| 本仓完整手机扩展 | Vite 构建通过，仍为 `dist/index.mjs` |
| SDK / CLI tarball | 所有 exports 指向存在的文件；开发测试未进入发布包；接入/工作流文档随包携带 |
| CLI tarball 独立安装 | 在仓库外的专用目录安装成功；安装后 CLI 的实际源码与本仓待交付源码一致 |
| 隔离宿主 default / minimal | 使用实际 SDK tarball 安装依赖、构建通过 |
| 隔离独立软件模板 | 构建通过；产物约 27 kB，未包含手机宿主外壳 |
| 聊天 / 相册 / 电话分别打包 | 通过 CLI tarball 准备独立源码、安装 SDK tarball、构建全部通过；保留原控制器 |
| 原设置和存档定义 | 与开工备份逐文件 SHA-256 比较，见下方范围，均一致 |
| 差异格式 | `git diff --check` 通过 |

隔离安装过程中曾遇到沙箱 DNS、一次 npm 下载连接重置以及 Windows 本地 SDK 链接权限错误；在专用验证目录重试后完成安装与构建。未以仓库根目录的依赖链接替代独立产物验证。

## 数据兼容核对范围

逐字节保持原样：手机 `phone-host-schema.ts`、HUD 配置、聊天/相册 `settings-fields.ts`、电话 `settings.ts`、三个软件的 `save-fields.ts`、通知模块、手机编辑器模块，以及根 `extension.json` 与 `package.json`。程序 ID 未改变；旧宿主的默认扩展 ID 保持原值。没有访问或写入 Studio 的用户数据、授权和工程存储目录。

控制器入口只增加设置桥并保留原 settings/saveSchema/methods。打包测试额外放入自定义设置、存档和方法，确认输出软件源码逐字保留，根入口导出同一个控制器，没有生成替代空类。

## 验证边界

- 根工程完整 TypeScript 检查仍有既有问题：`sdk/index.ts:22` 引用缺失的 `./extension-inspector`。本次没有改合同副本或伪造该接口；除该项外，当前检查没有报告新的类型错误。
- 未同步扩展到 Studio，未启动或重启 Studio/Preview，未进行新代码的真实 UI、读档、手机设置、聊天/来电交互验收。这些项目保持待验证，不能用单元测试或构建结果代替。
- 旧 SDK/CLI 版本号保持不变，本次 tarball 仅作本地验证，未 npm publish、未上传工坊、未创建 tag；Git 交付按后续用户确认执行。
- 编辑器内既有聊天数组/预览兼容适配仍保留，以维持旧设置行为；新应用通过 schema 和自定义 pane 扩展。跨扩展同名程序仍要求全局唯一，不提供多命名空间并存。

用户后续已确认 Git 提交一并纳入本次结构调整和此前的聊天恢复、手机视口及版本调整。未修改 `E:/light-engine` 的现有开发改动。
