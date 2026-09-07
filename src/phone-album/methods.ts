/**
 * @file methods.ts
 * @description 相册内页五个 Studio 方法的 `method()` 描述，供 `PhoneAlbumExtension`
 *              类体上以静态属性赋值挂载。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.2.0
 *
 * @remarks
 * - 只导出五个已构造好的 `method()` 结果（`BrandedExtensionMethod`）。
 * - `run` / `runImmediately` / `skip` 里的 `this` 是本模块 `PhoneAlbumExtension` 实例，
 *   `this.save` 为本模块独立存档（无前缀键名）。
 * - 每个执行体先按 Preview runtime key 调用 `bindAlbumSave(runtimeKey, this.save)`。
 * - 相册场景为纯数据操作，方法不挂起等待 UI，`run` / `runImmediately` / `skip`
 *   行为一致。
 */

import {
  type ExtensionContext,
  method,
} from "@avg-studio/sdk";

import { parseCommaIds, parseMediaType } from "./domain/index";
import {
  bindAlbumSave,
  cacheAuthorSettings,
  executeAddAlbum,
  executeAddMedia,
  executeRemoveAlbum,
  executeRemoveMedia,
  executeSetMediaAlbums,
  getAlbumRuntimeKey,
  readAuthorSettings,
} from "./runtime/index";

/**
 * 绑定 save 并刷新作者设置缓存。
 *
 * @param instanceSave - 本模块实例 this.save
 * @param ctx - 扩展上下文
 */
function prepareRuntime(instanceSave: unknown, ctx: ExtensionContext): object {
  const runtimeKey = getAlbumRuntimeKey(ctx);
  bindAlbumSave(
    runtimeKey,
    instanceSave as Parameters<typeof bindAlbumSave>[1],
  );
  cacheAuthorSettings(runtimeKey, readAuthorSettings(ctx));
  return runtimeKey;
}

/**
 * 执行「新增 / 覆盖相册」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数
 * @param instanceSave - 包装类实例 this.save
 *
 * @remarks
 * 提取为模块级辅助函数，避免 `runImmediately` / `skip` 在静态属性初始化器中
 * 自引用 `albumAddAlbumMethod.run`，从而触发 TS7022/TS7023。
 */
function executeAddAlbumMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  const runtimeKey = prepareRuntime(instanceSave, ctx);
  const coverAsset =
    typeof params.coverAsset === "string" ? params.coverAsset : undefined;
  executeAddAlbum(runtimeKey, {
    albumId: String(params.albumId ?? ""),
    name: String(params.name ?? ""),
    coverMediaId:
      typeof params.coverMediaId === "string" && params.coverMediaId !== ""
        ? params.coverMediaId
        : undefined,
    coverAsset,
  });
}

/**
 * 执行「删除相册」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数
 * @param instanceSave - 包装类实例 this.save
 */
function executeRemoveAlbumMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  const runtimeKey = prepareRuntime(instanceSave, ctx);
  executeRemoveAlbum(runtimeKey, String(params.albumId ?? ""));
}

/**
 * 方法参数中的 asset 可能是字符串或 `{ url }` / `{ uri }`。
 *
 * @param value - 原始方法参数
 * @returns URI 字符串
 */
function coerceMethodAsset(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const raw = value as { url?: unknown; uri?: unknown };
    if (typeof raw.url === "string" && raw.url.trim()) return raw.url.trim();
    if (typeof raw.uri === "string" && raw.uri.trim()) return raw.uri.trim();
  }
  return String(value ?? "").trim();
}

/**
 * 执行「新增 / 覆盖媒体」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数
 * @param instanceSave - 包装类实例 this.save
 */
function executeAddMediaMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  const runtimeKey = prepareRuntime(instanceSave, ctx);
  const type = parseMediaType(params.type) ?? "image";
  const durationSec =
    typeof params.durationSec === "number" &&
    Number.isFinite(params.durationSec) &&
    params.durationSec > 0
      ? params.durationSec
      : undefined;
  const asset = coerceMethodAsset(params.asset);
  const posterRaw = coerceMethodAsset(params.posterAsset);
  executeAddMedia(runtimeKey, {
    mediaId: String(params.mediaId ?? ""),
    type,
    asset,
    albumIds: parseCommaIds(params.albumIds),
    durationSec,
    ...(posterRaw ? { posterAsset: posterRaw } : {}),
  });
}

/**
 * 执行「删除媒体」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数
 * @param instanceSave - 包装类实例 this.save
 */
function executeRemoveMediaMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  const runtimeKey = prepareRuntime(instanceSave, ctx);
  executeRemoveMedia(runtimeKey, String(params.mediaId ?? ""));
}

/**
 * 执行「替换媒体归属」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数
 * @param instanceSave - 包装类实例 this.save
 */
function executeSetMediaAlbumsMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  const runtimeKey = prepareRuntime(instanceSave, ctx);
  executeSetMediaAlbums(
    runtimeKey,
    String(params.mediaId ?? ""),
    parseCommaIds(params.albumIds),
  );
}

/**
 * 「新增 / 覆盖相册」方法描述。
 *
 * @remarks
 * 方法 ID：`add-album`。供 `PhoneAlbumExtension` 挂载：
 * ```ts
 * static addAlbum = albumAddAlbumMethod;
 * ```
 */
export const albumAddAlbumMethod = method({
  id: "add-album",
  title: "相册 · 新增相册",
  description: "新增或覆盖一个相册；空 albumId 被忽略。",
  schema: {
    albumId: { type: "string", label: "相册 ID", required: true },
    name: { type: "string", label: "相册名称" },
    coverMediaId: { type: "string", label: "封面媒体 ID（可选）" },
    coverAsset: {
      type: "asset",
      label: "封面图（可选）",
      assetType: "image",
    },
  },
  run(ctx, params) {
    executeAddAlbumMethod(ctx, params as Record<string, unknown>, this.save);
  },
  runImmediately(ctx, params) {
    executeAddAlbumMethod(ctx, params as Record<string, unknown>, this.save);
  },
  skip(ctx, params) {
    executeAddAlbumMethod(ctx, params as Record<string, unknown>, this.save);
  },
});

/**
 * 「删除相册」方法描述。
 *
 * @remarks
 * 方法 ID：`remove-album`。禁止删除虚拟「全部」相册。
 */
export const albumRemoveAlbumMethod = method({
  id: "remove-album",
  title: "相册 · 删除相册",
  description: "隐藏一个相册；空 id 或虚拟「全部」相册被忽略。",
  schema: {
    albumId: { type: "string", label: "相册 ID", required: true },
  },
  run(ctx, params) {
    executeRemoveAlbumMethod(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
  runImmediately(ctx, params) {
    executeRemoveAlbumMethod(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
  skip(ctx, params) {
    executeRemoveAlbumMethod(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
});

/**
 * 「新增 / 覆盖媒体」方法描述。
 *
 * @remarks
 * 方法 ID：`add-media`。`mediaId` 必填；`type` 仅接受 `image` / `video`，
 * 非法值回落到 `image`；`albumIds` 为逗号分隔字符串。
 */
export const albumAddMediaMethod = method({
  id: "add-media",
  title: "相册 · 新增媒体",
  description: "新增或覆盖一条媒体；空 mediaId 被忽略。",
  schema: {
    mediaId: { type: "string", label: "媒体 ID", required: true },
    type: { type: "string", label: "类型 image|video", default: "image" },
    asset: { type: "asset", label: "素材", assetType: "any", required: true },
    posterAsset: {
      type: "asset",
      label: "视频封面图（可选）",
      assetType: "image",
    },
    albumIds: {
      type: "string",
      label: "所属相册 ID（逗号分隔）",
    },
    durationSec: { type: "number", label: "视频时长秒（可选）" },
  },
  run(ctx, params) {
    executeAddMediaMethod(ctx, params as Record<string, unknown>, this.save);
  },
  runImmediately(ctx, params) {
    executeAddMediaMethod(ctx, params as Record<string, unknown>, this.save);
  },
  skip(ctx, params) {
    executeAddMediaMethod(ctx, params as Record<string, unknown>, this.save);
  },
});

/**
 * 「删除媒体」方法描述。
 *
 * @remarks
 * 方法 ID：`remove-media`。仅从可见列表隐藏，保留默认媒体种子。
 */
export const albumRemoveMediaMethod = method({
  id: "remove-media",
  title: "相册 · 删除媒体",
  description: "从媒体库隐藏一条媒体；空 mediaId 被忽略。",
  schema: {
    mediaId: { type: "string", label: "媒体 ID", required: true },
  },
  run(ctx, params) {
    executeRemoveMediaMethod(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
  runImmediately(ctx, params) {
    executeRemoveMediaMethod(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
  skip(ctx, params) {
    executeRemoveMediaMethod(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
});

/**
 * 「替换媒体归属」方法描述。
 *
 * @remarks
 * 方法 ID：`set-media-albums`。`albumIds` 为逗号分隔字符串，空串清空归属。
 */
export const albumSetMediaAlbumsMethod = method({
  id: "set-media-albums",
  title: "相册 · 设置媒体归属",
  description: "整体替换一条媒体所属的相册列表；空 mediaId 被忽略。",
  schema: {
    mediaId: { type: "string", label: "媒体 ID", required: true },
    albumIds: {
      type: "string",
      label: "新归属相册 ID（逗号分隔）",
    },
  },
  run(ctx, params) {
    executeSetMediaAlbumsMethod(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
  runImmediately(ctx, params) {
    executeSetMediaAlbumsMethod(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
  skip(ctx, params) {
    executeSetMediaAlbumsMethod(
      ctx,
      params as Record<string, unknown>,
      this.save,
    );
  },
});
