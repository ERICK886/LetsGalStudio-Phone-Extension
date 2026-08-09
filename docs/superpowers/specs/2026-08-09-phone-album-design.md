# 手机相册内页（phone-album）设计规格

> **日期**：2026-08-09  
> **状态**：待审阅  
> **范围**：宿主仓 `src/phone-album/` 内页 APP（同包独立 Extension 模块）  
> **非目标**：玩家本机上传；独立扩展包拆分；等待玩家浏览完毕的挂起方法

## 1. 背景与目标

在 LetsGal 手机宿主内提供类似系统相册的只读浏览体验：多相册、图片/视频网格与查看器；作者通过设置预置内容，并通过 Fragment 方法在剧情中增删相册与媒体。

**成功标准**

1. 作者设置 `phoneAppId = phone-album` 可打开内页。  
2. 开局可见默认相册与默认媒体；剧情方法可增删并写入存档。  
3. 玩家只能浏览，不能通过 UI 增删。  
4. 一条媒体可属于多个相册；「全部」为虚拟总览。

## 2. 已确认决策

| 项 | 定案 |
| --- | --- |
| 落点 | `src/phone-album/`（宿主仓内，非独立 pack） |
| 架构 | 方案 A：同包独立 `Extension`，`@extension({ id: "phone-album" })` + `registerPhoneApp({ id: "phone-album" })`，从 `src/index.tsx` 导出；与 `PhoneExtension` 同 bundle |
| 媒体来源 | 设置默认媒体 + Fragment 方法增删；**永不**做玩家上传 |
| 组织 | 多相册 + 媒体；一条媒体可属多个相册；「全部」为虚拟总览 |
| 相册名单 | 设置默认相册 + 方法增删相册 |
| 玩家 | 只读：网格 / 大图 / 播视频；UI 不能增删 |
| 删相册 | 不删媒体（仍在「全部」） |
| 删媒体 | 从全局库与所有相册归属中移除 |
| 快进 / `runImmediately` | 仍写存档，不打开 UI |
| 挂起类方法 | 第一版不做 |

## 3. 工程落点与 ID

| 项 | 值 |
| --- | --- |
| 目录 | `src/phone-album/` |
| 程序 / `phoneAppId` | `phone-album` |
| `@extension({ id })` | `phone-album` |
| 扩展包 id | 宿主包 `ink.zenly.ext-7a9373`（同 bundle 多模块） |
| 入口 | `src/index.tsx`：`bootstrap` 注册内页 + `export { PhoneAlbumExtension }`（名称以实现为准） |

**说明**：`registerPhoneApp({ id })` 必须等于 `@extension({ id })`，故不能把方法挂在宿主 `PhoneExtension`（id=`phone`）上。

建议目录结构：

```text
src/phone-album/
  index.tsx              # Extension：settings / saveSchema / methods / onRegister
  register.tsx           # registerPhoneApp
  constants.ts           # PROGRAM_ID 等
  ui/                    # 首页 → 网格 → 查看器
  domain/                # 纯函数：合并默认与存档、增删规则
  runtime/               # 读写存档编排
```

作者侧：启用宿主扩展 → 动作 `phoneAppId = phone-album` → 剧情调用**相册模块**（`phone-album`）的方法，不是「手机」模块。

## 4. UI 信息架构（只读）

```text
相册首页
  ├─ 「全部」卡片（虚拟：汇总所有可见媒体）
  └─ 各相册卡片（封面缩略图 + 名称 + 数量）
        ↓
媒体网格（3～4 列）
  · 图片：缩略图
  · 视频：缩略图 + 角标 ▶ / 时长（有则显示）
        ↓
查看器
  · 图片：全屏；左右滑切同上下文（当前相册或「全部」）内相邻项
  · 视频：内置播放控件（播放/暂停、进度）；返回退出
```

| 操作 | 行为 |
| --- | --- |
| 顶栏返回 | 查看器 → 网格 → 首页 → `closeApp`（回桌面） |
| 空相册 | 可配置文案提示 |
| 素材失效 | 占位格，不崩溃 |

视觉：手机内嵌深色或浅色网格，对齐宿主安全区；不做系统级「选图 / 分享」。

## 5. 设置与存档

### 5.1 作者设置（settings）

| 配置 | 作用 |
| --- | --- |
| `defaultAlbums` | `{ id, name, coverAsset? }`：开局可见相册 |
| `defaultMedia` | `{ id, type: "image" \| "video", asset, albumIds[] }`：开局媒体，可挂多个相册 |
| 文案类 | 应用标题、空相册提示、「全部」显示名等（少量） |

默认项只在**尚无存档覆盖**时作为种子；读档后以存档为准。

### 5.2 存档（saveSchema，slot）

| 字段 | 结构 |
| --- | --- |
| `albumsExtra` | 相对默认新增的相册 id 列表（或与 meta 合并表达） |
| `albumsRemoved` | 相对默认被删/隐藏的相册 id |
| `albumsMeta` | 动态或覆盖元数据：`{ id, name, coverMediaId? }` |
| `media` | 全局媒体库：`{ id, type, asset, createdAt, durationSec? }[]` |
| `albumMedia` | 多对多归属：`{ albumId, mediaId }[]` |
| `mediaRemoved` | 相对默认媒体被剧情删除的 id |

### 5.3 合并规则

1. 可见相册 = 默认相册 − `albumsRemoved` + `albumsExtra` / `albumsMeta`。  
2. 可见媒体 = 种子默认媒体 ∪ 存档 `media`，再扣 `mediaRemoved`（及等价删除）。  
3. 「全部」= 全部可见媒体；某相册 = 按 `albumMedia`（含默认媒体的 `albumIds` 种子归属）过滤。  
4. 删相册：只移除相册与归属行，**不删**媒体（仍在「全部」）。  
5. 删媒体：从 `media`（或记入 `mediaRemoved`）与所有 `albumMedia` 移除。  

封面：相册卡片优先 `coverMediaId` / 设置 `coverAsset`，否则取该相册第一张媒体缩略图。

## 6. Fragment 方法

模块：`phone-album`（Studio 选该模块）。快进仍改存档，不打开 UI。

| 方法 ID | 作用 | 主要参数 |
| --- | --- | --- |
| `add-album` | 动态添加相册 | `albumId`、`name`、可选封面媒体/素材 |
| `remove-album` | 隐藏/删除相册（不删媒体） | `albumId` |
| `add-media` | 添加图片或视频，挂到 1～N 个相册 | `mediaId`、`type`、`asset`、`albumIds`、可选 `durationSec` |
| `remove-media` | 从库中删除，并清掉所有相册归属 | `mediaId` |
| `set-media-albums` | 覆盖某媒体所属相册 | `mediaId`、`albumIds` |

**约定**

- id 由作者填写。重复 `add-*`：**以覆盖为准**（同 id 更新名称/素材/归属等）。  
- `albumIds` 含不存在的相册 id → 忽略该 id（可 console 警告），不整单失败。  
- 删除默认相册：写入 `albumsRemoved`；再 `add-album` 同 id 可从 removed 中恢复并更新 meta。  
- 第一版不做「等待玩家看完」类挂起。

## 7. 与宿主集成

1. 实现 `PhoneAlbumExtension`（含 settings / save / methods）。  
2. `onRegister`（或等价时机）调用 `registerPhoneAlbumPhoneApp` → `registerPhoneApp({ id: "phone-album", ... })`。  
3. `src/index.tsx`：在现有 `bootstrapPhonePluginApps` 注册表中加入相册注册函数，并 `export` 该 Extension。  
4. 宿主设置里为动作配置 `phoneAppId = phone-album`（或桌面图标映射，按现有宿主约定）。

## 8. 错误与边界

| 场景 | 行为 |
| --- | --- |
| 非法 / 空 id | 方法 no-op 或警告，不抛未捕获异常到剧情 |
| 媒体 asset 缺失 | UI 占位；方法仍可写入存档 |
| 空库 / 空相册 | 显示空态文案 |
| 同 id 重复 add | 覆盖更新 |

## 9. 测试建议（实现阶段）

- `domain` 纯函数：合并默认与存档、删相册不删媒体、删媒体清归属、多对多、`set-media-albums`。  
- 方法编排：对 mock slot 的增删与覆盖语义。  
- 手工：Studio 打开内页三层导航 + 快进后存档仍生效。

## 10. 非目标（明确不做）

- 玩家本机上传或拍照。  
- 分享、编辑、多选批量删除 UI。  
- 独立 npm / 独立扩展包拆分（可用后续 `pack` 抽取，不在本规格）。  
- 等待玩家关闭查看器的同步剧情挂起。
