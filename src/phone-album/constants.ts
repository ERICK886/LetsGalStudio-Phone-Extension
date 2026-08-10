/**
 * @file constants.ts
 * @description 手机相册内页模块常量（宿主包 id、程序 ID、应用完整引用）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * - 本模块从独立扩展 `ink.zenly.app-cd6ad3` 迁入宿主包 `ink.zenly.ext-7a9373`，
 *   作为 `src/phone-album/` 模块存在；不再以独立 Extension 形式注册。
 * - `EXTENSION_ID` 与宿主 `extension.json` 的 `id` 一致；Studio 方法块 `target`
 *   以该 id 开头，例如 `ink.zenly.ext-7a9373/phone-album/add-media`。
 * - `PROGRAM_ID` 与 `@extension({ id })` / `registerPhoneApp({ id })` 一致，
 *   SDK 要求 kebab-case（仅 a-z、0-9、-），**不能**使用带点号的包 id。
 * - 宿主「动作 · 手机内部应用」须填完整路径：
 *   `{EXTENSION_ID}/{PROGRAM_ID}` → `ink.zenly.ext-7a9373/phone-album`（phone-sdk ≥ 0.5.5）。
 */

/**
 * 扩展包 id（与宿主 `extension.json` 的 `id` 一致，可含点号）。
 */
export const EXTENSION_ID = "ink.zenly.ext-7a9373";

/**
 * Studio 程序 ID / `@extension({ id })` / `registerPhoneApp({ id })`。
 */
export const PROGRAM_ID = "phone-album";

/**
 * 宿主设置里「Phone SDK 应用 ID」完整路径。
 *
 * @remarks
 * 由 `扩展ID/程序ID` 拼接，供宿主「动作 · 手机内部应用」字段使用。
 */
export const PHONE_APP_REF = `${EXTENSION_ID}/${PROGRAM_ID}`;

/** 虚拟「全部」相册 id（永不写入存档 albums）。 */
export const ALL_ALBUM_ID = "__all__";

/** 拍照写入的「相机胶卷」相册 id（动态创建，不进作者默认设置）。 */
export const CAMERA_ALBUM_ID = "camera-roll";

/** 「相机胶卷」显示名。 */
export const CAMERA_ALBUM_NAME = "相机胶卷";

/** 字符串字段默认最大长度。 */
export const MAX_LABEL_LEN = 40;

/** Font Awesome 6 CSS CDN（cdnjs）。 */
export const FONT_AWESOME_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";

/**
 * 临时借存档槽读取官方截图缓存时使用的槽位（用完即删）。
 * 选用冷门大号，避免误伤玩家常用档位。
 */
export const CAPTURE_TEMP_SLOT = 987_651;

/** 写入存档的拍照 Data URL 软上限（字符长度，约 1.5MB）。 */
export const MAX_PHOTO_DATA_URL_CHARS = Math.floor(1.5 * 1024 * 1024);
