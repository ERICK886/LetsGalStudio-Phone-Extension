/**
 * @file index.tsx
 * @description 手机相册扩展模块：独立 `@extension` 程序，自有设置 / 存档 / Fragment 方法。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.4.0
 *
 * @remarks
 * - 扩展包 id：`ink.zenly.ext-7a9373`（与宿主同包多模块）
 * - 程序 ID：`phone-album`（`@extension` / `registerPhoneApp`）
 * - Phone SDK 应用 ID：填 `phone-album`
 * - `autonomous: true`：启动即挂载实例，确保 onInit 绑定 this.save（内页拍照不经过 Fragment 方法）
 * - 内页 UI 由宿主入口 `bootstrapPhonePluginApps` 注册；本类 `onRegister` 只缓存设置，不重复 register。
 * - Studio 方法 target：`ink.zenly.ext-7a9373/phone-album/<method-id>`
 */

import {
  defineSave,
  Extension,
  extension,
  settings,
  type ExtensionContext,
} from "@avg-studio/sdk";

import { PROGRAM_ID } from "./constants";
import { buildAlbumSettingsFields } from "./settings-fields";
import { albumSaveSchemaFields } from "./save-fields";
import {
  albumAddAlbumMethod,
  albumRemoveAlbumMethod,
  albumAddMediaMethod,
  albumRemoveMediaMethod,
  albumSetMediaAlbumsMethod,
} from "./methods";
import {
  ALBUM_SETTINGS_KEYS,
  cacheAuthorSettings,
  readAuthorSettings,
} from "./runtime/settings";
import { bindAlbumSave } from "./runtime/store";

/** Studio 相册方法内联卡片（深蓝主题）；副作用安装。 */
import "./studio/album-inline-cards";

/**
 * 手机相册扩展控制器。
 *
 * @remarks
 * 内页由 `registerPhoneApp`（bootstrap）注入宿主手机屏幕；本类负责本模块设置、存档与方法。
 * 相册场景为纯数据操作，方法不挂起等待 UI。
 */
@extension({
  id: PROGRAM_ID,
  label: "手机相册",
  exposeUI: false,
  /** 启动即挂载实例，确保 onInit 绑定 this.save（内页拍照不经过 Fragment 方法）。 */
  autonomous: true,
})
export class PhoneAlbumExtension extends Extension {
  /**
   * 作者设置：文案、默认相册、默认媒体（本模块独立命名空间）。
   */
  static settings = settings((s) => buildAlbumSettingsFields(s));

  /**
   * 存档字段（slot + 相机 shared；本模块独立命名空间）。
   */
  static saveSchema = defineSave(albumSaveSchemaFields);

  static addAlbum = albumAddAlbumMethod;
  static removeAlbum = albumRemoveAlbumMethod;
  static addMedia = albumAddMediaMethod;
  static removeMedia = albumRemoveMediaMethod;
  static setMediaAlbums = albumSetMediaAlbumsMethod;

  /**
   * Studio 加载时缓存默认设置并订阅变更；不重复 `registerPhoneApp`。
   *
   * @param ctx - 本模块扩展上下文
   */
  static onRegister(ctx: ExtensionContext): void {
    cacheAuthorSettings(readAuthorSettings(ctx));

    for (const key of ALBUM_SETTINGS_KEYS) {
      ctx.settings.subscribe(key, () => {
        cacheAuthorSettings(readAuthorSettings(ctx));
      });
    }
  }

  /**
   * 实例初始化时绑定本模块 save（autonomous 启动或方法调用时都会走到）。
   */
  onInit(): void {
    bindAlbumSave(this.save as unknown as Parameters<typeof bindAlbumSave>[0]);
  }

  /**
   * 常驻控制器：再次确保 save 绑定（兼容宿主晚注入 save proxy）。
   *
   * @returns 空 UI（exposeUI: false，不向系统槽位导出）
   */
  render() {
    bindAlbumSave(this.save as unknown as Parameters<typeof bindAlbumSave>[0]);
    return {
      component: () => null,
      props: {},
    };
  }
}

export default PhoneAlbumExtension;

/** 内页注册（向 Phone SDK 注入相册内页）。 */
export { registerPhoneAlbumPhoneApp } from "./ui/index";

/** 常量：扩展包 id、程序 ID、完整应用引用。 */
export { EXTENSION_ID, PROGRAM_ID, PHONE_APP_REF } from "./constants";

/** 设置 / 存档字段工厂。 */
export { buildAlbumSettingsFields } from "./settings-fields";
export { albumSaveSchemaFields } from "./save-fields";

/** 方法描述（已挂到本类静态属性）。 */
export {
  albumAddAlbumMethod,
  albumRemoveAlbumMethod,
  albumAddMediaMethod,
  albumRemoveMediaMethod,
  albumSetMediaAlbumsMethod,
} from "./methods";

/** 运行时辅助。 */
export {
  ALBUM_SETTINGS_KEYS,
  cacheAuthorSettings,
  getCachedAuthorSettings,
  readAuthorSettings,
} from "./runtime/settings";
