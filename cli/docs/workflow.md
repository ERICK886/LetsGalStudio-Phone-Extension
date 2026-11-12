# 手机工程、构建与发布流程

## 新建与添加

```powershell
# 完整手机宿主，包含第一个软件
node cli/bin/create-phone-app.js create ./my-phone --kind host --extensionId acme.phone --appId acme-notes --title 便签
# 独立软件，与已安装手机宿主协作
node cli/bin/create-phone-app.js create ./my-notes --kind plugin --extensionId acme.notes --appId acme-notes --title 便签
# 在生成的工程目录执行
create-phone-app add acme-todo --title 待办
create-phone-app doctor
create-phone-app build
```

`create` 支持 `--template default|minimal`。`--sdk` 可指定 SDK npm 版本或绝对 `file:` 路径；本仓开发默认用本地 SDK。独立安装的 CLI 使用它的发布配置，不能把仓库里的未发布版本视为 npm 已有版本。

新目录布局：

```text
phone-project.json          # kind、appsDir、registry
extension.json              # Studio 扩展包身份
src/index.tsx               # Studio 模块导出
src/phone-apps.ts            # 软件注册清单
src/apps/acme-notes/
  phone-app.json             # 软件 ID、注册函数、原控制器导出
  index.tsx                 # 软件控制器与注册函数
  app.tsx                   # 内页 UI
sdk/                        # CLI 随包提供的 Studio 合同
```

本仓保留 `src/phone-chat`、`src/phone-album`、`src/phone-call`，通过 `phone-project.json.appsDir: "src"` 接入。无项目描述的旧工程仍根据原 `definePhonePluginRegistry` 入口识别。新增软件时使用语法树定位列表，可保留注释与尾逗号；注入失败会在写应用文件前报错。

`create` 不覆盖已有扩展工程；`add` 不覆盖已有软件，即使传了旧版 `--force` 也不会抹掉控制器。已有软件请直接编辑或使用新的 ID。

## 软件描述

```json
{
  "schemaVersion": 1,
  "id": "acme-notes",
  "registration": { "entry": "index.tsx", "export": "registerAcmeNotesPhoneApp" },
  "controller": { "entry": "index.tsx", "exports": ["AcmeNotesController"] }
}
```

入口路径相对于软件目录。复杂软件可分别指定 `ui/register.tsx` 与 `index.tsx`；不能仅按软件 ID 猜测函数名。旧软件打包前补此描述，明确原控制器，避免生成空类导致设置/存档/方法丢失。

## 独立打包

```powershell
create-phone-app pack acme-notes --extensionId acme.notes
create-phone-app pack acme-notes --prepare --out release/review-notes
create-phone-app pack acme-notes --skipInstall --out release/acme-notes --force
```

默认输出 `release/<app-id>`。`--prepare` 仅生成源码；`--skipInstall` 使用已有依赖构建。`--force` 只允许覆盖带有同一软件 `phone-package.json` 标记的已有产物，不允许覆盖工程、源码、SDK 或依赖目录。

打包复制软件源码及实际引用的工程内共享模块，保留目录关系；忽略测试与依赖目录。第三方包必须在源工程 dependencies/peerDependencies 声明可分发版本；未声明或本地依赖直接报错。独立入口重新注册 UI，**原样导出真正的软件控制器**，不改它的设置、存档或剧情方法。

## 发布准备

```powershell
# 对实际待发布的宿主或独立软件
create-phone-app doctor --release
# 发布 SDK/CLI 时，分别检查真实 tarball
pnpm --dir phone-sdk pack --pack-destination ../release/artifacts
pnpm --dir cli pack --pack-destination ../release/artifacts
```

`doctor --release` 检查软件描述、入口、依赖、安装后的 SDK 子入口和 `dist/index.mjs`，拒绝本地 SDK 依赖。它不声称已完成真实 Studio 验收，也不自动发布。

本次新增 SDK API 与 CLI 模板须配套发布：先确定一个未占用的新 SDK 版本，更新 CLI 的 `inkZenly.phoneSdkVersion`，生成 tarball 并用独立工程验证；确认 SDK 版本在 npm 可用后再发布依赖它的 CLI。当前源码保留已有版本号，产物仅用于本地验证，不能覆盖远端同版本。

发布审核需区分：SDK/CLI npm 包、完整手机扩展、独立软件扩展。工坊扩展通过 Studio 的正式上传流程交付，CLI 不代替上传、不推送 Git、不创建 tag。不要把 `pack` 成功表述为已上线。

## 既有数据兼容

本仓升级不改变扩展包 ID、程序 ID、设置键、saveSchema、桌面条目或存储目录。拆包产物用于新增安装；把旧软件迁移到另一个扩展包会改变 Studio 的存储归属，不能靠相同程序 ID 自动承接旧设置和存档，须另做显式迁移。

电话和聊天共用的角色标签适配已从聊天模块提取到 `src/shared`，独立电话包不再因导入工具函数加载聊天的编辑器副作用。
