/**
 * @file index.tsx
 * @description 手机相册扩展入口：设置、存档、Fragment 方法与内页注册。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * - 扩展包 id：`ext-7a9373`（见 extension.json）
 * - 程序 / phoneAppId：`phone-album`（与 `@extension({ id })` / `registerPhoneApp` 一致）
 * - 与宿主 `chat` / `demo-shop` 不互通；需同时启用手机宿主扩展
 */

import {
  defineSave,
  Extension,
  extension,
  method,
  settings,
  type ExtensionContext,
} from "@avg-studio/sdk";

import { PROGRAM_ID } from "./constants";
import { parseCommaIds, parseMediaType } from "./domain/index";
import {
  bindAlbumSave,
  cacheAuthorSettings,
  executeAddAlbum,
  executeAddMedia,
  executeRemoveAlbum,
  executeRemoveMedia,
  executeSetMediaAlbums,
  readAuthorSettings,
} from "./runtime/index";
import type { AlbumMedia, AlbumMediaLink, AlbumMeta } from "./types";
import { registerPhoneAlbumPhoneApp } from "./ui/index";

/**
 * 绑定 save 并刷新作者设置缓存。
 *
 * @param instanceSave - 扩展实例 this.save
 * @param ctx - 扩展上下文
 */
function prepareRuntime(instanceSave: unknown, ctx: ExtensionContext): void {
  bindAlbumSave(instanceSave as Parameters<typeof bindAlbumSave>[0]);
  cacheAuthorSettings(readAuthorSettings(ctx));
}

/**
 * 执行「新增 / 覆盖相册」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数
 * @param instanceSave - 扩展实例 this.save
 *
 * @remarks
 * 提取为模块级辅助函数，避免 `runImmediately` / `skip` 在静态属性初始化器中
 * 自引用 `PhoneAlbumExtension.addAlbum.run`，从而触发 TS7022/TS7023。
 */
function executeAddAlbumMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  prepareRuntime(instanceSave, ctx);
  const coverAsset = typeof params.coverAsset === "string" ? params.coverAsset : undefined;
  executeAddAlbum({
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
 * @param instanceSave - 扩展实例 this.save
 */
function executeRemoveAlbumMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  prepareRuntime(instanceSave, ctx);
  executeRemoveAlbum(String(params.albumId ?? ""));
}

/**
 * 执行「新增 / 覆盖媒体」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数
 * @param instanceSave - 扩展实例 this.save
 */
function executeAddMediaMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  prepareRuntime(instanceSave, ctx);
  const type = parseMediaType(params.type) ?? "image";
  const durationSec =
    typeof params.durationSec === "number" && Number.isFinite(params.durationSec)
      ? params.durationSec
      : undefined;
  executeAddMedia({
    mediaId: String(params.mediaId ?? ""),
    type,
    asset: String(params.asset ?? ""),
    albumIds: parseCommaIds(params.albumIds),
    durationSec,
  });
}

/**
 * 执行「删除媒体」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数
 * @param instanceSave - 扩展实例 this.save
 */
function executeRemoveMediaMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  prepareRuntime(instanceSave, ctx);
  executeRemoveMedia(String(params.mediaId ?? ""));
}

/**
 * 执行「替换媒体归属」方法的核心逻辑。
 *
 * @param ctx - 扩展上下文
 * @param params - 方法块参数
 * @param instanceSave - 扩展实例 this.save
 */
function executeSetMediaAlbumsMethod(
  ctx: ExtensionContext,
  params: Record<string, unknown>,
  instanceSave: unknown,
): void {
  prepareRuntime(instanceSave, ctx);
  executeSetMediaAlbums(
    String(params.mediaId ?? ""),
    parseCommaIds(params.albumIds),
  );
}

/**
 * 手机相册扩展控制器。
 *
 * @remarks
 * 内页由 `registerPhoneApp` 注入宿主手机屏幕；本类负责设置、存档与方法。
 * 相册场景为纯数据操作，方法不挂起等待 UI，`run` / `runImmediately` / `skip`
 * 行为一致。
 */
@extension({
  id: PROGRAM_ID,
  label: "手机相册",
  exposeUI: false,
})
export class PhoneAlbumExtension extends Extension {
  /**
   * 作者设置：文案、默认相册、默认媒体。
   */
  static settings = settings((s) => ({
    appTitle: s.string("应用标题").default("相册"),
    allAlbumsLabel: s.string("「全部」显示名").default("全部"),
    emptyAlbumHint: s.string("空相册提示").default("这里还没有照片"),
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

  /**
   * 存档字段（跟游戏进度，slot）。
   *
   * @property albumsExtra - 动态新增的相册 id
   * @property albumsRemoved - 被隐藏的默认相册 id
   * @property albumsMeta - 相册元数据覆盖（名称 / 封面）
   * @property media - 动态媒体条目
   * @property albumMedia - 多对多归属边
   * @property mediaRemoved - 被删除的媒体 id
   */
  static saveSchema = defineSave({
    albumsExtra: {
      type: "list",
      persistence: "slot",
      default: [] as string[],
      label: "动态相册 id",
    },
    albumsRemoved: {
      type: "list",
      persistence: "slot",
      default: [] as string[],
      label: "已移除默认相册",
    },
    albumsMeta: {
      type: "list",
      persistence: "slot",
      default: [] as AlbumMeta[],
      label: "相册元数据",
    },
    media: {
      type: "list",
      persistence: "slot",
      default: [] as AlbumMedia[],
      label: "动态媒体库",
    },
    albumMedia: {
      type: "list",
      persistence: "slot",
      default: [] as AlbumMediaLink[],
      label: "相册-媒体归属",
    },
    mediaRemoved: {
      type: "list",
      persistence: "slot",
      default: [] as string[],
      label: "已移除默认媒体",
    },
  });

  /**
   * Studio 加载时注册内页并缓存默认设置；订阅设置变更以刷新缓存。
   *
   * @param ctx - 扩展上下文
   */
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

  /**
   * 实例初始化时绑定 save（若宿主创建了实例）。
   */
  onInit(): void {
    bindAlbumSave(this.save as unknown as Parameters<typeof bindAlbumSave>[0]);
  }

  /**
   * 新增 / 覆盖相册。
   *
   * @remarks
   * 方法 ID：`add-album`。
   * `albumId` 必填；`name` 缺省回落到 `albumId`；`coverMediaId` / `coverAsset` 可选。
   */
  static addAlbum = method({
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
   * 删除相册（仅隐藏，保留媒体归属）。
   *
   * @remarks
   * 方法 ID：`remove-album`。禁止删除虚拟「全部」相册。
   */
  static removeAlbum = method({
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
   * 新增 / 覆盖媒体。
   *
   * @remarks
   * 方法 ID：`add-media`。`mediaId` 必填；`type` 仅接受 `image` / `video`，
   * 非法值回落到 `image`；`albumIds` 为逗号分隔字符串。
   */
  static addMedia = method({
    id: "add-media",
    title: "相册 · 新增媒体",
    description: "新增或覆盖一条媒体；空 mediaId 被忽略。",
    schema: {
      mediaId: { type: "string", label: "媒体 ID", required: true },
      type: { type: "string", label: "类型 image|video", default: "image" },
      asset: { type: "asset", label: "素材", assetType: "any", required: true },
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
   * 删除媒体。
   *
   * @remarks
   * 方法 ID：`remove-media`。仅从可见列表隐藏，保留默认媒体种子。
   */
  static removeMedia = method({
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
   * 替换媒体归属的相册列表。
   *
   * @remarks
   * 方法 ID：`set-media-albums`。`albumIds` 为逗号分隔字符串，空串清空归属。
   */
  static setMediaAlbums = method({
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
}

export default PhoneAlbumExtension;
