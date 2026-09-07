/**
 * @file constants.ts
 * @description 手机相册内页模块常量（宿主包 id、程序 ID）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.1
 *
 * @remarks
 * - 本模块从独立扩展 `ink.zenly.app-cd6ad3` 迁入宿主包 `ink.zenly.ext-7a9373`。
 * - Studio 方法块 `target` 仍以扩展包 id 开头，例如
 *   `ink.zenly.ext-7a9373/phone-album/add-media`。
 * - 宿主「动作 · 手机内部应用」的 Phone SDK 应用 ID：**只填程序 ID** `phone-album`
 *  （与 `registerPhoneApp({ id })` 一致），无需再写扩展包 ID。
 */

/**
 * 扩展包 id（与宿主 `extension.json` 的 `id` 一致）。
 */
export const EXTENSION_ID = "ink.zenly.ext-7a9373";

/**
 * Studio 程序 ID / `registerPhoneApp({ id })` / 宿主 Phone SDK 应用 ID。
 */
export const PROGRAM_ID = "phone-album";

/**
 * 宿主「动作 · 手机内部应用」应填写的 Phone SDK 应用 ID（= 程序 ID）。
 */
export const PHONE_APP_REF = PROGRAM_ID;

/** 虚拟「全部」相册 id（永不写入存档 albums）。 */
export const ALL_ALBUM_ID = "__all__";

/** 拍照写入的「相机胶卷」相册 id（动态创建，不进作者默认设置）。 */
export const CAMERA_ALBUM_ID = "camera-roll";

/** 「相机胶卷」显示名。 */
export const CAMERA_ALBUM_NAME = "相机胶卷";

/** 字符串字段默认最大长度。 */
export const MAX_LABEL_LEN = 40;

/**
 * 临时借存档槽读取官方截图缓存时使用的起始槽位。
 * 运行时会先读取已有槽位并向上寻找空位，绝不覆盖玩家存档；用完在 finally 中删除。
 */
export const CAPTURE_TEMP_SLOT = 987_651;

/** 写入存档的拍照 Data URL 软上限（字符长度，约 1.5MB）。 */
export const MAX_PHOTO_DATA_URL_CHARS = Math.floor(1.5 * 1024 * 1024);
