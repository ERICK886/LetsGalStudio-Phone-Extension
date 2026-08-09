# phone-album 手机相册内页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在宿主仓 `src/phone-album/` 实现只读相册内页（多相册 / 图视频浏览）+ 作者设置种子 + Fragment 方法增删，程序 id `phone-album`。

**Architecture:** 同包独立 `Extension`（`exposeUI: false`），镜像旁路 `app-015abe`：settings / saveSchema / methods 在控制器；`onRegister` 缓存设置并 `registerPhoneApp`；domain 纯函数合并默认与存档；runtime 绑定 save；UI 只读三层导航。与 `PhoneExtension` 同 bundle，从 `src/index.tsx` 导出。

**Tech Stack:** React 18、`@avg-studio/sdk`（本仓 `file:./sdk`）、`@ink-zenly/phone-sdk/plugin`、TypeScript、Vite；domain 单测用 `node --import tsx --test`（与 `cli/` 一致）。

**Spec:** `docs/superpowers/specs/2026-08-09-phone-album-design.md`

## Global Constraints

- 程序 / `@extension({ id })` / `registerPhoneApp({ id })` / 作者 `phoneAppId` 一律为 `phone-album`（不可挂到宿主 `phone`）。
- 扩展包 id 仍为宿主 `ink.zenly.ext-7a9373`；类名导出 `PhoneAlbumExtension`。
- 永不做玩家本机上传；UI 只读。
- 删相册不删媒体；删媒体清全局与所有归属。
- 重复 `add-*`：**以覆盖为准**；非法/空 id → 警告 + no-op，不抛到剧情。
- `albumIds` 含不存在相册 → 忽略该 id 并 `console.warn`，不整单失败。
- 快进 / `runImmediately` / `skip`：仍写存档，不打开 UI；不做挂起等待。
- 内页 `useExtensionContext()` 是宿主 scope：必须 `cacheAuthorSettings` + `bindAlbumSave`（对齐 chat）。
- 源码文件头：`@file` / `@author 池水三两升` / `@date 2026-08-09` / `@version`；函数含中文 `@param` / `@returns` / `@throws` / `@example`；必要空行。
- `docs/` 被 `.gitignore` 忽略；若提交规格/计划需 `git add -f`。
- PowerShell：命令用 `;` 连接，不用 bash `&&` / HEREDOC。

---

## File Structure

```text
src/phone-album/
  constants.ts                 # PROGRAM_ID、虚拟「全部」id、文案上限
  types.ts                     # 存档 / 设置 / 视图模型类型
  domain/
    id.ts                      # 规范化 id
    parse.ts                   # 逗号分隔 albumIds、方法参数解析
    merge.ts                   # 默认 + 存档 → 可见相册/媒体
    mutations.ts               # 对 AlbumSaveState 的纯函数增删
    index.ts
    merge.test.ts
    mutations.test.ts
    parse.test.ts
  runtime/
    bus.ts                     # 轻量订阅，驱动 UI 刷新
    settings.ts                # read / cache / getCached
    store.ts                   # bindAlbumSave + get/set state
    actions.ts                 # 编排方法副作用
    index.ts
  ui/
    register.tsx               # registerPhoneAlbumPhoneApp
    AlbumApp.tsx               # 路由状态机：home | grid | viewer
    screens/
      HomeScreen.tsx
      GridScreen.tsx
      ViewerScreen.tsx
    components/
      AppHeader.tsx
      EmptyHint.tsx
      AlbumCard.tsx
      MediaThumb.tsx
    hooks/
      useAlbumSession.ts       # 订阅 store + 合并视图
      useSafeAreaStyle.ts
    styles/
      inject-styles.ts
    index.ts
  index.tsx                    # PhoneAlbumExtension

src/index.tsx                  # 导出 PhoneAlbumExtension + bootstrap 注册
```

---

### Task 1: 常量与类型

**Files:**
- Create: `src/phone-album/constants.ts`
- Create: `src/phone-album/types.ts`

**Interfaces:**
- Consumes: 无
- Produces: `PROGRAM_ID`、`ALL_ALBUM_ID`、`AlbumSaveState`、`AlbumAuthorSettings`、`AlbumMedia`、`AlbumMeta`、`AlbumView`、`MediaView`

- [ ] **Step 1: 写入常量**

```ts
/**
 * @file constants.ts
 * @description 手机相册内页常量。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

/** Studio 程序 ID / phoneAppId / @extension id / registerPhoneApp id。 */
export const PROGRAM_ID = "phone-album";

/** 虚拟「全部」相册 id（永不写入存档 albums）。 */
export const ALL_ALBUM_ID = "__all__";

/** 字符串字段默认最大长度。 */
export const MAX_LABEL_LEN = 40;
```

- [ ] **Step 2: 写入类型**

```ts
/**
 * @file types.ts
 * @description 手机相册设置、存档与视图模型类型。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

/** 媒体类型。 */
export type MediaType = "image" | "video";

/** 存档中的媒体条目（动态库；默认媒体不强制写入此数组）。 */
export interface AlbumMedia {
  id: string;
  type: MediaType;
  asset: string;
  createdAt: number;
  durationSec?: number;
}

/** 相册元数据（动态相册或覆盖默认相册显示名/封面）。 */
export interface AlbumMeta {
  id: string;
  name: string;
  coverMediaId?: string;
  coverAsset?: string;
}

/** 多对多归属。 */
export interface AlbumMediaLink {
  albumId: string;
  mediaId: string;
}

/** slot 存档状态（与 defineSave 字段一一对应）。 */
export interface AlbumSaveState {
  albumsExtra: string[];
  albumsRemoved: string[];
  albumsMeta: AlbumMeta[];
  media: AlbumMedia[];
  albumMedia: AlbumMediaLink[];
  mediaRemoved: string[];
}

/** 设置中的默认相册行（规范化后）。 */
export interface DefaultAlbumSeed {
  id: string;
  name: string;
  coverAsset?: string;
}

/** 设置中的默认媒体行（规范化后）。 */
export interface DefaultMediaSeed {
  id: string;
  type: MediaType;
  asset: string;
  albumIds: string[];
  durationSec?: number;
}

/** 作者设置快照。 */
export interface AlbumAuthorSettings {
  appTitle: string;
  allAlbumsLabel: string;
  emptyAlbumHint: string;
  defaultAlbums: DefaultAlbumSeed[];
  defaultMedia: DefaultMediaSeed[];
}

/** UI：相册卡片。 */
export interface AlbumView {
  id: string;
  name: string;
  count: number;
  coverAsset?: string;
  isVirtualAll?: boolean;
}

/** UI：媒体格。 */
export interface MediaView {
  id: string;
  type: MediaType;
  asset: string;
  durationSec?: number;
}
```

- [ ] **Step 3: Commit**

```powershell
git add src/phone-album/constants.ts src/phone-album/types.ts
git commit -m "feat(phone-album): 添加常量与类型"
```

---

### Task 2: domain — id / parse / merge（TDD）

**Files:**
- Create: `src/phone-album/domain/id.ts`
- Create: `src/phone-album/domain/parse.ts`
- Create: `src/phone-album/domain/merge.ts`
- Create: `src/phone-album/domain/index.ts`
- Create: `src/phone-album/domain/parse.test.ts`
- Create: `src/phone-album/domain/merge.test.ts`

**Interfaces:**
- Consumes: `types.ts`、`constants.ts`
- Produces:
  - `normalizeId(raw: unknown): string`
  - `parseCommaIds(raw: unknown): string[]`
  - `parseMediaType(raw: unknown): MediaType | null`
  - `buildAlbumCatalog(settings: AlbumAuthorSettings, save: AlbumSaveState): { albums: AlbumView[]; mediaByAlbum: Map<string, MediaView[]>; allMedia: MediaView[] }`

- [ ] **Step 1: 写失败测试 `parse.test.ts`**

```ts
/**
 * @file parse.test.ts
 * @description parse 纯函数单测。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeId, parseCommaIds, parseMediaType } from "./parse.js";

describe("normalizeId", () => {
  it("trims and rejects empty", () => {
    assert.equal(normalizeId("  a1  "), "a1");
    assert.equal(normalizeId("   "), "");
    assert.equal(normalizeId(null), "");
  });
});

describe("parseCommaIds", () => {
  it("splits unique ids", () => {
    assert.deepEqual(parseCommaIds("a, b, a"), ["a", "b"]);
    assert.deepEqual(parseCommaIds(""), []);
  });
});

describe("parseMediaType", () => {
  it("accepts image|video", () => {
    assert.equal(parseMediaType("image"), "image");
    assert.equal(parseMediaType("VIDEO"), "video");
    assert.equal(parseMediaType("gif"), null);
  });
});
```

- [ ] **Step 2: 写失败测试 `merge.test.ts`（核心用例）**

```ts
/**
 * @file merge.test.ts
 * @description 默认 + 存档合并单测。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_ALBUM_ID } from "../constants.js";
import type { AlbumAuthorSettings, AlbumSaveState } from "../types.js";
import { buildAlbumCatalog } from "./merge.js";

const emptySave = (): AlbumSaveState => ({
  albumsExtra: [],
  albumsRemoved: [],
  albumsMeta: [],
  media: [],
  albumMedia: [],
  mediaRemoved: [],
});

const baseSettings = (): AlbumAuthorSettings => ({
  appTitle: "相册",
  allAlbumsLabel: "全部",
  emptyAlbumHint: "空",
  defaultAlbums: [{ id: "trip", name: "旅行" }],
  defaultMedia: [
    {
      id: "m1",
      type: "image",
      asset: "asset://m1",
      albumIds: ["trip"],
    },
  ],
});

describe("buildAlbumCatalog", () => {
  it("seeds defaults into all + album", () => {
    const cat = buildAlbumCatalog(baseSettings(), emptySave());
    assert.equal(cat.allMedia.length, 1);
    assert.equal(cat.mediaByAlbum.get("trip")?.length, 1);
    const allCard = cat.albums.find((a) => a.id === ALL_ALBUM_ID);
    assert.ok(allCard);
    assert.equal(allCard!.count, 1);
  });

  it("remove album keeps media in all", () => {
    const save = emptySave();
    save.albumsRemoved = ["trip"];
    const cat = buildAlbumCatalog(baseSettings(), save);
    assert.ok(!cat.albums.some((a) => a.id === "trip"));
    assert.equal(cat.allMedia.length, 1);
  });

  it("mediaRemoved hides default media", () => {
    const save = emptySave();
    save.mediaRemoved = ["m1"];
    const cat = buildAlbumCatalog(baseSettings(), save);
    assert.equal(cat.allMedia.length, 0);
  });

  it("dynamic media + multi album links", () => {
    const save = emptySave();
    save.albumsExtra = ["fav"];
    save.albumsMeta = [{ id: "fav", name: "收藏" }];
    save.media = [
      {
        id: "m2",
        type: "video",
        asset: "asset://m2",
        createdAt: 1,
        durationSec: 12,
      },
    ];
    save.albumMedia = [
      { albumId: "trip", mediaId: "m2" },
      { albumId: "fav", mediaId: "m2" },
    ];
    const cat = buildAlbumCatalog(baseSettings(), save);
    assert.equal(cat.allMedia.length, 2);
    assert.equal(cat.mediaByAlbum.get("trip")?.length, 2);
    assert.equal(cat.mediaByAlbum.get("fav")?.length, 1);
  });
});
```

- [ ] **Step 3: 跑测确认失败**

```powershell
node --import tsx --test src/phone-album/domain/parse.test.ts src/phone-album/domain/merge.test.ts
```

Expected: FAIL（模块不存在或导出缺失）

- [ ] **Step 4: 实现 `id.ts` / `parse.ts` / `merge.ts` / `index.ts`**

`normalizeId`：`String(raw ?? "").trim()`。  
`parseCommaIds`：按 `,` / `，` 拆分、trim、去空、去重保序。  
`parseMediaType`：小写后仅 `"image"|"video"`。

`buildAlbumCatalog` 规则（必须严格对齐规格）：

1. 可见相册 id = 默认相册 id − `albumsRemoved` ∪ `albumsExtra`（及仅出现在 `albumsMeta` 且未 removed 的 id）。  
2. 相册显示名/封面：`albumsMeta` 覆盖默认；否则默认 `name` / `coverAsset`。  
3. 可见媒体：默认媒体（扣 `mediaRemoved`）∪ `save.media`（同 id 以 `save.media` 覆盖）；再扣 `mediaRemoved`。  
4. 归属：默认媒体的 `albumIds` 生成种子边；再并上 `save.albumMedia`；若某边指向已删相册，网格不展示该边，但媒体仍在「全部」。  
5. `albums` 列表：首项虚拟 `ALL_ALBUM_ID`（`allAlbumsLabel`、count=全部媒体数、封面=第一张媒体 asset），其后为可见相册（count=该相册媒体数，封面=`coverMediaId`→媒体 asset / `coverAsset` / 第一张）。  
6. `mediaByAlbum`：含真实相册 id；不含 `__all__`（UI 用 `allMedia`）。

`domain/index.ts` 再导出上述符号。

- [ ] **Step 5: 跑测确认通过**

```powershell
node --import tsx --test src/phone-album/domain/parse.test.ts src/phone-album/domain/merge.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```powershell
git add src/phone-album/domain
git commit -m "feat(phone-album): 实现合并与参数解析 domain"
```

---

### Task 3: domain — mutations（TDD）

**Files:**
- Create: `src/phone-album/domain/mutations.ts`
- Create: `src/phone-album/domain/mutations.test.ts`
- Modify: `src/phone-album/domain/index.ts`

**Interfaces:**
- Consumes: `AlbumSaveState`、`AlbumAuthorSettings`、`buildAlbumCatalog`（用于校验可见相册集合）
- Produces（均为纯函数，返回新 `AlbumSaveState`，不改入参）:
  - `applyAddAlbum(state, settings, { albumId, name, coverMediaId?, coverAsset? }): AlbumSaveState`
  - `applyRemoveAlbum(state, settings, albumId): AlbumSaveState`
  - `applyAddMedia(state, settings, { mediaId, type, asset, albumIds, durationSec? }): AlbumSaveState`
  - `applyRemoveMedia(state, settings, mediaId): AlbumSaveState`
  - `applySetMediaAlbums(state, settings, mediaId, albumIds): AlbumSaveState`

- [ ] **Step 1: 写失败测试**

```ts
/**
 * @file mutations.test.ts
 * @description 存档突变纯函数单测。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AlbumAuthorSettings, AlbumSaveState } from "../types.js";
import { buildAlbumCatalog } from "./merge.js";
import {
  applyAddAlbum,
  applyAddMedia,
  applyRemoveAlbum,
  applyRemoveMedia,
  applySetMediaAlbums,
} from "./mutations.js";

const settings = (): AlbumAuthorSettings => ({
  appTitle: "相册",
  allAlbumsLabel: "全部",
  emptyAlbumHint: "空",
  defaultAlbums: [{ id: "trip", name: "旅行" }],
  defaultMedia: [
    { id: "m1", type: "image", asset: "a1", albumIds: ["trip"] },
  ],
});

const empty = (): AlbumSaveState => ({
  albumsExtra: [],
  albumsRemoved: [],
  albumsMeta: [],
  media: [],
  albumMedia: [],
  mediaRemoved: [],
});

describe("mutations", () => {
  it("add-album upserts meta and clears removed", () => {
    let s = empty();
    s.albumsRemoved = ["trip"];
    s = applyAddAlbum(s, settings(), {
      albumId: "trip",
      name: "旅行改",
    });
    assert.ok(!s.albumsRemoved.includes("trip"));
    assert.equal(s.albumsMeta.find((m) => m.id === "trip")?.name, "旅行改");
  });

  it("remove-album does not remove media from all", () => {
    let s = empty();
    s = applyRemoveAlbum(s, settings(), "trip");
    const cat = buildAlbumCatalog(settings(), s);
    assert.equal(cat.allMedia.length, 1);
    assert.ok(!cat.albums.some((a) => a.id === "trip"));
  });

  it("add-media upsert + links; ignores unknown album ids", () => {
    let s = empty();
    s = applyAddMedia(s, settings(), {
      mediaId: "m2",
      type: "video",
      asset: "v2",
      albumIds: ["trip", "nope"],
      durationSec: 3,
    });
    assert.equal(s.media.length, 1);
    assert.deepEqual(
      s.albumMedia.filter((l) => l.mediaId === "m2").map((l) => l.albumId),
      ["trip"],
    );
  });

  it("remove-media clears links and marks default removed", () => {
    let s = empty();
    s = applyRemoveMedia(s, settings(), "m1");
    assert.ok(s.mediaRemoved.includes("m1"));
    const cat = buildAlbumCatalog(settings(), s);
    assert.equal(cat.allMedia.length, 0);
  });

  it("set-media-albums replaces links", () => {
    let s = empty();
    s = applyAddAlbum(s, settings(), { albumId: "fav", name: "收藏" });
    s = applyAddMedia(s, settings(), {
      mediaId: "m2",
      type: "image",
      asset: "x",
      albumIds: ["trip"],
    });
    s = applySetMediaAlbums(s, settings(), "m2", ["fav"]);
    assert.deepEqual(
      s.albumMedia.filter((l) => l.mediaId === "m2").map((l) => l.albumId),
      ["fav"],
    );
  });
});
```

- [ ] **Step 2: 跑测确认失败**

```powershell
node --import tsx --test src/phone-album/domain/mutations.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现 `mutations.ts`**

行为细则：

- 空 `albumId`/`mediaId`：返回原 state 浅拷贝或同一引用均可，但测试不依赖；实现时 **返回原 state** 并可选 `console.warn`。  
- `applyAddAlbum`：从 `albumsRemoved` 去掉 id；若不在默认相册且不在 `albumsExtra` 则 push extra；upsert `albumsMeta`。  
- `applyRemoveAlbum`：若为默认相册 → 写入 `albumsRemoved`；否则从 `albumsExtra`/`albumsMeta` 删除；删除该 `albumId` 的全部 `albumMedia` 行；**不**动 `media` / `mediaRemoved`。禁止删除 `ALL_ALBUM_ID`。  
- `applyAddMedia`：从 `mediaRemoved` 去掉 id；upsert `media[]`；按可见相册集合过滤 `albumIds`（未知 id → warn + skip）；**替换**该 media 的全部归属边为过滤后列表。  
- `applyRemoveMedia`：从 `media[]` 删除；push 到 `mediaRemoved`（若尚未有）；删除全部相关 `albumMedia`；清理各相册 `coverMediaId === mediaId`。  
- `applySetMediaAlbums`：媒体不存在（合并后也无）→ no-op；否则替换归属边（同样过滤未知相册）。

可见相册 id 集合：抽私有 `listVisibleAlbumIds(settings, state): Set<string>`，逻辑与 merge 一致（勿循环依赖：可在 mutations 内复制精简版，或把 `listVisibleAlbumIds` 放到 `merge.ts` 并导出）。

- [ ] **Step 4: 跑测通过 + 导出**

```powershell
node --import tsx --test src/phone-album/domain/mutations.test.ts src/phone-album/domain/merge.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/phone-album/domain
git commit -m "feat(phone-album): 实现相册存档突变 domain"
```

---

### Task 4: runtime（store / settings / bus / actions）

**Files:**
- Create: `src/phone-album/runtime/bus.ts`
- Create: `src/phone-album/runtime/settings.ts`
- Create: `src/phone-album/runtime/store.ts`
- Create: `src/phone-album/runtime/actions.ts`
- Create: `src/phone-album/runtime/index.ts`

**Interfaces:**
- Consumes: domain mutations/merge、types
- Produces:
  - `bindAlbumSave(api)` / `getAlbumSaveState()` / `setAlbumSaveState(next)` / `subscribeAlbumStore(listener)`
  - `readAuthorSettings(ctx)` / `cacheAuthorSettings` / `getCachedAuthorSettings`
  - `executeAddAlbum` … `executeSetMediaAlbums`（供 Extension 调用）

- [ ] **Step 1: 实现 `bus.ts`**

对齐 chat：`Set<() => void>` 的 `subscribe` / `emit`；`emitAlbumBus()`。

- [ ] **Step 2: 实现 `settings.ts`**

- `readAuthorSettings(ctx)`：读 `appTitle`、`allAlbumsLabel`、`emptyAlbumHint`、`defaultAlbums`、`defaultMedia`。  
- 默认相册行：`id`/`name` 字符串；`coverAsset` 取 asset 字段字符串（空则省略）。  
- 默认媒体行：`type` 经 `parseMediaType`（失败则跳过该行）；`albumIds` 用 `parseCommaIds` 读 `albumIds` 字符串字段；`asset` 必填。  
- 文案空则回落：`相册` / `全部` / `这里还没有照片`。  
- `cacheAuthorSettings` / `getCachedAuthorSettings`（模块级变量）。

- [ ] **Step 3: 实现 `store.ts`**

对齐 `app-015abe/src/runtime/store.ts`：

- `AlbumSaveMap` 与 `AlbumSaveState` 同形（六个 list 字段）。  
- `bindAlbumSave`：空档 + 内存脏则回写；否则用存档覆盖内存。  
- `getAlbumSaveState` / `patch` 写回后 `emitAlbumBus()`。  
- list 字段整体 `save.set`，禁止原地 push。

- [ ] **Step 4: 实现 `actions.ts`**

```ts
export function executeAddAlbum(input: {
  albumId: string;
  name: string;
  coverMediaId?: string;
  coverAsset?: string;
}): void {
  const settings = getCachedAuthorSettings();
  const next = applyAddAlbum(getAlbumSaveState(), settings, input);
  setAlbumSaveState(next);
}
// remove-album / add-media / remove-media / set-media-albums 同理
```

空 id：`console.warn` + return。

- [ ] **Step 5: 导出 `runtime/index.ts`**

- [ ] **Step 6: Commit**

```powershell
git add src/phone-album/runtime
git commit -m "feat(phone-album): 添加 runtime store/settings/actions"
```

---

### Task 5: Extension 控制器（settings / save / methods）

**Files:**
- Create: `src/phone-album/index.tsx`

**Interfaces:**
- Consumes: runtime + domain parse + `registerPhoneAlbumPhoneApp`（Task 6 可先 stub：本任务先写 Extension，若 register 尚未存在则先在本文件底部临时 `function registerPhoneAlbumPhoneApp(){}` **禁止**——应先完成 Task 6 Step1 register stub，或本任务与 Task 6 注册文件同批。**推荐顺序：先写 `ui/register.tsx` 最小 stub，再写本文件。**）
- Produces: `export class PhoneAlbumExtension`

- [ ] **Step 1: 先建最小 `ui/register.tsx` + `ui/index.ts`（若尚未存在）**

```tsx
/**
 * @file register.tsx
 * @description 向 Phone SDK 注册相册内页。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

import { registerPhoneApp } from "@ink-zenly/phone-sdk/plugin";
import { PROGRAM_ID } from "../constants";

/**
 * 注册 phoneAppId = phone-album。
 *
 * @returns void
 */
export function registerPhoneAlbumPhoneApp(): void {
  registerPhoneApp({
    id: PROGRAM_ID,
    title: "相册",
    description: "手机相册内页",
    render: () => <div data-phone-album-stub style={{ padding: 16 }}>相册加载中…</div>,
  });
}
```

`ui/index.ts`：`export { registerPhoneAlbumPhoneApp } from "./register";`

- [ ] **Step 2: 实现 `PhoneAlbumExtension`**

要点（对齐 chat，方法用模块级 `executeXxx` 避免 TS7022）：

```tsx
@extension({
  id: PROGRAM_ID,
  label: "手机相册",
  exposeUI: false,
})
export class PhoneAlbumExtension extends Extension {
  static settings = settings((s) => ({
    appTitle: s.string("应用标题").default("相册"),
    allAlbumsLabel: s.string("「全部」显示名").default("全部"),
    emptyAlbumHint: s
      .string("空相册提示")
      .default("这里还没有照片"),
    defaultAlbums: s
      .array("默认相册", (item) => ({
        id: item.string("相册 ID").default("album-1"),
        name: item.string("名称").default("默认相册"),
        coverAsset: item.asset("封面（可选）").accepts("image"),
      }))
      .maxItems(40)
      .addLabel("添加默认相册"),
    defaultMedia: s
      .array("默认媒体", (item) => ({
        id: item.string("媒体 ID").default("media-1"),
        type: item.string("类型 image|video").default("image"),
        asset: item.asset("素材").accepts("any"),
        albumIds: item
          .string("所属相册 ID")
          .default("")
          .describe("逗号分隔，可属多个相册"),
        durationSec: item.number("视频时长秒（可选）").default(0),
      }))
      .maxItems(200)
      .addLabel("添加默认媒体"),
  }));

  static saveSchema = defineSave({
    albumsExtra: { type: "list", persistence: "slot", default: [] as string[], label: "动态相册 id" },
    albumsRemoved: { type: "list", persistence: "slot", default: [] as string[], label: "已移除默认相册" },
    albumsMeta: { type: "list", persistence: "slot", default: [] as AlbumMeta[], label: "相册元数据" },
    media: { type: "list", persistence: "slot", default: [] as AlbumMedia[], label: "动态媒体库" },
    albumMedia: { type: "list", persistence: "slot", default: [] as AlbumMediaLink[], label: "相册-媒体归属" },
    mediaRemoved: { type: "list", persistence: "slot", default: [] as string[], label: "已移除默认媒体" },
  });

  static onRegister(ctx: ExtensionContext): void {
    cacheAuthorSettings(readAuthorSettings(ctx));
    registerPhoneAlbumPhoneApp();
    for (const key of [
      "appTitle",
      "allAlbumsLabel",
      "emptyAlbumHint",
      "defaultAlbums",
      "defaultMedia",
    ] as const) {
      ctx.settings.subscribe(key, () => {
        cacheAuthorSettings(readAuthorSettings(ctx));
      });
    }
  }

  // 五个 method：add-album / remove-album / add-media / remove-media / set-media-albums
  // 每个均提供 run / runImmediately / skip → 调用同一模块级 execute*
  // prepareRuntime(this.save, ctx) = bindAlbumSave + cacheAuthorSettings(readAuthorSettings(ctx))
}
```

方法 schema 约定：

| method id | 关键 schema 字段 |
| --- | --- |
| `add-album` | `albumId` string required；`name` string；`coverMediaId` string optional；`coverAsset` asset image optional |
| `remove-album` | `albumId` string required |
| `add-media` | `mediaId` string；`type` string；`asset` asset any；`albumIds` string（逗号分隔）；`durationSec` number optional |
| `remove-media` | `mediaId` string |
| `set-media-albums` | `mediaId` string；`albumIds` string |

`run` / `runImmediately` / `skip` 均：`prepareRuntime` → `execute*`（不 await UI）。

- [ ] **Step 3: 确认 TypeScript 能解析（可选）**

```powershell
pnpm exec tsc --noEmit -p tsconfig.json
```

若工程无根 tsc 脚本，改为 `pnpm build` 在 Task 8 验证。

- [ ] **Step 4: Commit**

```powershell
git add src/phone-album/index.tsx src/phone-album/ui/register.tsx src/phone-album/ui/index.ts
git commit -m "feat(phone-album): 添加 Extension 设置存档与方法"
```

---

### Task 6: UI — 会话 hook + 三层屏幕

**Files:**
- Create: `src/phone-album/ui/hooks/useSafeAreaStyle.ts`
- Create: `src/phone-album/ui/hooks/useAlbumSession.ts`
- Create: `src/phone-album/ui/styles/inject-styles.ts`
- Create: `src/phone-album/ui/components/AppHeader.tsx`
- Create: `src/phone-album/ui/components/EmptyHint.tsx`
- Create: `src/phone-album/ui/components/AlbumCard.tsx`
- Create: `src/phone-album/ui/components/MediaThumb.tsx`
- Create: `src/phone-album/ui/screens/HomeScreen.tsx`
- Create: `src/phone-album/ui/screens/GridScreen.tsx`
- Create: `src/phone-album/ui/screens/ViewerScreen.tsx`
- Create: `src/phone-album/ui/AlbumApp.tsx`
- Modify: `src/phone-album/ui/register.tsx`（改用 `AlbumApp`）
- Modify: `src/phone-album/ui/index.ts`

**Interfaces:**
- Consumes: `PhoneAppRenderProps`、`getCachedAuthorSettings`、`getAlbumSaveState`、`subscribeAlbumStore`、`buildAlbumCatalog`、`resolveAssetUrl`（从 `@ink-zenly/phone-sdk` 或宿主 `asset-utils`——**优先**在 UI 内用 `useExtensionContext().asset.resolve`，对已是 `http`/`data:`/`local://` 的 URL 直接使用）
- Produces: 可浏览的只读 UI

- [ ] **Step 1: `useAlbumSession`**

订阅 bus；每次 emit 用 `buildAlbumCatalog(getCachedAuthorSettings(), getAlbumSaveState())` 返回 `{ settings, catalog }`。挂载时若 save 未 bind，仍可用空存档 + 缓存设置渲染默认种子。

- [ ] **Step 2: `AlbumApp` 导航状态**

```ts
type Nav =
  | { screen: "home" }
  | { screen: "grid"; albumId: string }
  | { screen: "viewer"; albumId: string; mediaId: string };
```

- 返回：viewer→grid→home→`closeApp()`。  
- `albumId === ALL_ALBUM_ID` 时网格用 `catalog.allMedia`。  
- 查看器左右滑：同列表相邻 `mediaId`（仅图片滑动切页；视频页显示 `<video controls>`）。

- [ ] **Step 3: 屏幕与组件**

- `HomeScreen`：标题 `settings.appTitle`；卡片网格：「全部」+ 各相册。  
- `GridScreen`：3～4 列；视频角标；空则 `EmptyHint`。  
- `ViewerScreen`：图片全屏 + 左右按钮/滑动；视频播放器；素材失败显示占位块。  
- 样式：`inject-styles.ts` 注入一次 scoped class（深色底、安全区），勿依赖全局污染。

- [ ] **Step 4: 更新 `register.tsx`**

```tsx
render: (props) => <AlbumApp {...props} />,
title: 可用 getCachedAuthorSettings().appTitle（注册时读一次；设置变更不强制 re-register）
```

- [ ] **Step 5: Commit**

```powershell
git add src/phone-album/ui
git commit -m "feat(phone-album): 实现只读相册三层 UI"
```

---

### Task 7: 挂到宿主入口

**Files:**
- Modify: `src/index.tsx`

**Interfaces:**
- Consumes: `registerPhoneAlbumPhoneApp`、`PhoneAlbumExtension`
- Produces: Studio 可加载模块 + 宿主启动时注册内页

- [ ] **Step 1: 修改 `src/index.tsx`**

```tsx
import {
  bootstrapPhonePluginApps,
  definePhonePluginRegistry,
} from "@ink-zenly/phone-sdk/plugin";
import { registerDemoShopPhoneApp } from "./demo-shop";
import { registerPhoneAlbumPhoneApp } from "./phone-album/ui";
import { PhoneAlbumExtension } from "./phone-album";

bootstrapPhonePluginApps(
  definePhonePluginRegistry(
    registerDemoShopPhoneApp,
    registerPhoneAlbumPhoneApp,
  ),
);

export { PhoneExtension, ToastExtension } from "@ink-zenly/phone-sdk";
export { default } from "@ink-zenly/phone-sdk";
export { PhoneAlbumExtension };
```

说明：`onRegister` 与 bootstrap 可能各注册一次；`registerPhoneApp` 同 id 覆盖即可，可接受。

- [ ] **Step 2: 构建验证**

```powershell
pnpm build
```

Expected: 成功产出 `dist/index.mjs`，无 TS 错误。

- [ ] **Step 3: 再跑 domain 单测**

```powershell
node --import tsx --test src/phone-album/domain/*.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```powershell
git add src/index.tsx src/phone-album
git commit -m "feat(phone-album): 导出模块并注册到宿主 bootstrap"
```

---

### Task 8: 作者向说明（最小）

**Files:**
- Modify: `src/README.md`（若存在内页列表，追加 `phone-album` 一行）
- 可选：宿主根 `README.md` 仅当已有内页应用列表时追加；**不要**大改作者文档结构

- [ ] **Step 1: 在 `src/README.md` 增加短节**

说明：

1. `phoneAppId = phone-album`  
2. 设置默认相册/媒体  
3. Fragment 方法在模块「手机相册」上调用  
4. 玩家只读  

- [ ] **Step 2: Commit**

```powershell
git add src/README.md
git commit -m "docs: 补充 phone-album 内页用法"
```

---

## Spec Coverage Checklist（计划自检）

| 规格项 | 任务 |
| --- | --- |
| 目录 / ID / 方案 A | Task 1, 5, 7 |
| 三层只读 UI | Task 6 |
| settings 默认相册/媒体/文案 | Task 5 |
| saveSchema 六字段 | Task 5 |
| 合并规则 1–5 | Task 2–3 |
| 五个 Fragment 方法 + 快进写档 | Task 3–5 |
| 覆盖语义 / 未知 albumId | Task 3 |
| 宿主 export + bootstrap | Task 7 |
| 无玩家上传 / 无挂起 | 全局约束；方法不 await UI |
| domain 测试 | Task 2–3 |

---

## Manual Test Plan（实现完成后）

1. `pnpm build`；Studio 启用本扩展。  
2. 宿主设置加桌面应用，动作 `phoneAppId=phone-album`。  
3. 扩展设置加 1 相册 + 2 媒体（一图一视频，挂同一相册）。  
4. 打开手机 → 相册 → 见「全部」与相册卡片 → 网格 → 查看器滑图 / 播视频 → 返回至桌面。  
5. 剧情调用 `add-media` / `remove-album` / 快进，存档后重进内页状态正确。
