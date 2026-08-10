/**
 * @file index.tsx
 * @description 手机相册内页模块入口：仅导出注册函数、常量与方法描述，
 *              供宿主 `StudioPhoneExtension`（Task 4）合并挂载。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.3.0
 *
 * @remarks
 * - 本模块从独立扩展 `ink.zenly.app-cd6ad3` 迁入宿主包 `ink.zenly.ext-7a9373`，
 *   作为 `src/phone-album/` 模块存在；**不再**以独立 `Extension` 子类形式注册。
 * - 不导出 `PhoneAlbumExtension` 类；方法以 `method()` 描述形式导出，由 Task 4 在
 *   `StudioPhoneExtension` 上以静态属性赋值挂载。
 * - 扩展包 id：`ink.zenly.ext-7a9373`（见宿主 `extension.json`）
 * - 程序 ID：`phone-album`（`@extension` / `registerPhoneApp`）
 * - 宿主填写 Phone SDK 应用 ID：`phone-album`（仅程序 ID）
 */

// 内页注册（向 Phone SDK 注入相册内页）。
export { registerPhoneAlbumPhoneApp } from "./ui/index";

// 常量：扩展包 id、程序 ID、完整应用引用。
export { EXTENSION_ID, PROGRAM_ID, PHONE_APP_REF } from "./constants";

// 设置字段工厂（带 album 前缀），供宿主合并到 `static settings`。
export { buildAlbumSettingsFields } from "./settings-fields";

// 存档字段定义（带 album 前缀），供宿主合并到 `static saveSchema`。
export { albumSaveSchemaFields, ALBUM_SAVE_KEY_MAP } from "./save-fields";

// 五个方法描述，供 Task 4 在 `StudioPhoneExtension` 上以静态属性赋值挂载。
export {
  albumAddAlbumMethod,
  albumRemoveAlbumMethod,
  albumAddMediaMethod,
  albumRemoveMediaMethod,
  albumSetMediaAlbumsMethod,
} from "./methods";

// 运行时辅助：onRegister 订阅键、缓存读写。
export {
  ALBUM_SETTINGS_KEYS,
  cacheAuthorSettings,
  getCachedAuthorSettings,
  readAuthorSettings,
} from "./runtime/settings";

// Studio 编辑器内联卡片（深蓝主题）；副作用安装。
import "./studio/album-inline-cards";
