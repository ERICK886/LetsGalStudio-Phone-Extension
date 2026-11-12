# 自定义手机扩展结构设计

本次在现有工程上增量调整，保留手机、聊天、相册、电话的程序 ID、设置定义和存档字段。已有未提交的聊天恢复、视口与版本修改作为基线保留。

## 职责与目录

| 层 | 位置 / 公开入口 | 职责 |
| --- | --- | --- |
| 手机宿主 | `phone-sdk/src/host`、`@ink-zenly/phone-sdk/host` | 手机外壳、桌面、导航、HUD、通知；不初始化业务软件 |
| 软件协议 | `phone-sdk/src/client`、`@ink-zenly/phone-sdk/plugin` | 描述解析、注册、来源识别、生命周期、打开/关闭、事件 |
| 编辑器能力 | `@ink-zenly/phone-sdk/editor` | 手机编辑器和可复用编辑组件；应用按需引用 |
| 软件 | 当前 `src/phone-chat`、`src/phone-album`、`src/phone-call` | 各自拥有控制器、设置、存档、业务与 UI |
| 组合入口 | `src/phone-apps.ts` + `src/index.tsx` | 显式软件清单与 Studio 模块导出 |
| 开发工具 | `cli/src/commands`、`cli/src/utils`、`cli/templates` | 创建、检查、构建、打包；不隐式发布 |

旧 SDK 根入口继续兼容；新软件使用 `/plugin`，需要编辑组件时再使用 `/editor`。不将业务源码搬入 SDK。新脚手架把软件放在 `src/apps/<app-id>`，现有目录通过 `phone-project.json` 描述，无需为目录美观迁移旧工程。

## 应用解析与独立插件

程序 ID、扩展包 ID、桌面条目 ID 分别保留。新增注册来源 `extensionId`；完整引用解析时检查来源，不再无条件丢掉扩展段。裸程序 ID 和无来源的旧插件继续支持。程序 ID 仍要求全局唯一；不同已知来源抢占同名程序时明确拒绝，不改变现有存储命名空间。

解析与注册分层：纯解析提供规范化结果和诊断；注册管理队列和所有权。新增 `registerPhonePlugin({ extensionId, apps })` 集中注册软件，支持宿主晚加载、宿主重装和 HMR 替换，返回幂等清理函数；旧实例的清理不得删除新实例。保留原 bootstrap 和直接注册 API。

## CLI 与分发

`phone-project.json` 描述软件目录和注册清单位置；每个 `phone-app.json` 声明注册函数及 Studio 控制器导出。打包必须保留软件的真实控制器，而非重新生成丢失 settings/saveSchema/methods 的空类。

新项目支持宿主或独立软件模式；旧项目继续识别。添加软件先验证可注入，再写文件。构建和打包检查应用入口、依赖与目录边界，输出不得覆盖源码、SDK、已有配置。打包支持仅准备源码及跳过安装；发布前检查清单、SDK 版本来源、单入口产物和第三方依赖。实际 npm / 工坊上传、版本提升和推送不属于本次执行范围。

## 兼容与验收

- 不改 `extension.json.id`、程序 ID、settings 键、saveSchema、桌面条目和已有用户数据；不触发重置或自动迁移。
- 已有设置数据与持久化定义保持基线；覆盖裸 ID、完整引用、旧无来源插件、顺序注册、冲突、宿主重装、HMR、旧清理函数。
- 验证新宿主/独立软件生成、添加、打包时真实控制器保留、错误输入提前失败与产物独立构建。
- 分别记录定向测试、类型检查、构建与实际 Studio 验证。不开新 Studio 实例，不同步到已安装扩展；未执行的实机流程标为待验证。

本次不修改 Studio/Electron 主进程、preload 或安装产物，不涉及 Studio 整包发布。
