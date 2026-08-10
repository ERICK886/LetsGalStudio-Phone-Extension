/**
 * @file studio-phone-extension.tsx
 * @description 工坊用手机扩展包装类：合并 PhoneExtension（手机壳）+ 聊天内页
 *              + 相册内页的设置、存档与方法，作为单一扩展对外暴露。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 1.3.0
 *
 * @remarks
 * - 本类继承 `@ink-zenly/phone-sdk` 的 `PhoneExtension`，复用其手机壳 settings /
 *   saveSchema / onRegister / render；再合并 phone-chat 与 phone-album 两个内页
 *   模块的设置字段、存档字段与 Studio 方法。
 * - 内页应用（demo-shop / phone-chat / phone-album）的 `registerPhoneApp` 由
 *   `src/index.tsx` 的 `bootstrapPhonePluginApps` 统一注册；本类 `onRegister`
 *   不再重复注册，避免与 bootstrap 顺序耦合。
 * - 方法体里的 `this.save` 是包装类实例的 save（键含 `chat*` / `album*` 前缀），
 *   各内页 `methods.ts` 在执行前调用 `bindChatSave(this.save)` / `bindAlbumSave(this.save)`，
 *   由 store 适配器翻译键名。
 */

import {
  defineSave,
  extension,
  settings,
  type ExtensionContext,
} from "@avg-studio/sdk";
import {
  PhoneExtension,
  buildPhoneHostSettingsFields,
  phoneHostSaveSchema,
} from "@ink-zenly/phone-sdk";

import { buildChatSettingsFields } from "./phone-chat/settings-fields";
import { chatSaveSchemaFields } from "./phone-chat/save-fields";
import {
  CHAT_SETTINGS_KEYS,
  cacheAuthorSettings as cacheChatSettings,
  readAuthorSettings as readChatSettings,
} from "./phone-chat/runtime/settings";
import { bindChatSave } from "./phone-chat/runtime/store";
import { syncChatDesktopBadge } from "./phone-chat/runtime/desktop-badge";
import { resolveReplyWaitsForFriend } from "./phone-chat/runtime/reply-wait";
import {
  chatSendFriendMessagesMethod,
  chatAwaitPlayerReplyMethod,
  chatAddFriendMethod,
  chatRemoveFriendMethod,
} from "./phone-chat/methods";

import { buildAlbumSettingsFields } from "./phone-album/settings-fields";
import { albumSaveSchemaFields } from "./phone-album/save-fields";
import {
  ALBUM_SETTINGS_KEYS,
  cacheAuthorSettings as cacheAlbumSettings,
  readAuthorSettings as readAlbumSettings,
} from "./phone-album/runtime/settings";
import { bindAlbumSave } from "./phone-album/runtime/store";
import {
  albumAddAlbumMethod,
  albumRemoveAlbumMethod,
  albumAddMediaMethod,
  albumRemoveMediaMethod,
  albumSetMediaAlbumsMethod,
} from "./phone-album/methods";

/**
 * 工坊用手机扩展包装类。
 *
 * @remarks
 * - `@extension` 与父类 `PhoneExtension` 同 id `phone`：保留在子类上以便 Studio
 *   扫描到子类的新方法（Preview 能列出 `send-friend-messages` 等新方法为准）。
 *   若构建/运行期因重复装饰器报错，则改为仅在父类保留 `@extension`，并在报告中记录。
 * - `static settings` 合并手机壳 + 聊天 + 相册三组字段；三组字段名前缀互不冲突
 *   （`phone*` / `chat*` / `album*`），运行时包含全部手机壳字段。
 * - `static saveSchema` 合并三组存档字段；键映射适配器在各内页 store 中翻译逻辑名。
 * - `onRegister` 调用父类注册（安装宿主 + 绑定导航 + 注册打开动作），随后缓存并订阅
 *   聊天 / 相册的作者设置键，最后同步一次聊天桌面角标。
 * - `onInit` 在实例挂载后绑定 chat / album 的 save 适配器到 `this.save`。
 */
@extension({ id: "phone", label: "手机", category: "游戏系统" })
export class StudioPhoneExtension extends PhoneExtension {
  static settings = settings((s) => ({
    ...buildPhoneHostSettingsFields(s),
    ...buildChatSettingsFields(s),
    ...buildAlbumSettingsFields(s),
  }));

  static saveSchema = defineSave({
    ...phoneHostSaveSchema,
    ...chatSaveSchemaFields,
    ...albumSaveSchemaFields,
  });

  // 聊天内页方法
  static sendFriendMessages = chatSendFriendMessagesMethod;
  static awaitPlayerReply = chatAwaitPlayerReplyMethod;
  static addFriend = chatAddFriendMethod;
  static removeFriend = chatRemoveFriendMethod;

  // 相册内页方法
  static addAlbum = albumAddAlbumMethod;
  static removeAlbum = albumRemoveAlbumMethod;
  static addMedia = albumAddMediaMethod;
  static removeMedia = albumRemoveMediaMethod;
  static setMediaAlbums = albumSetMediaAlbumsMethod;

  static onRegister(ctx: ExtensionContext): void {
    // 父类：安装 phone-sdk 宿主、绑定导航、注册「打开手机」动作与快捷键订阅。
    PhoneExtension.onRegister(ctx);

    // 缓存初始作者设置，供内页 React 树（宿主 scope）读取。
    cacheChatSettings(readChatSettings(ctx));
    cacheAlbumSettings(readAlbumSettings(ctx));

    // 任一聊天 / 相册设置键变更即刷新对应缓存。
    for (const key of CHAT_SETTINGS_KEYS) {
      ctx.settings.subscribe(key, () =>
        cacheChatSettings(readChatSettings(ctx)),
      );
    }
    for (const key of ALBUM_SETTINGS_KEYS) {
      ctx.settings.subscribe(key, () =>
        cacheAlbumSettings(readAlbumSettings(ctx)),
      );
    }

    // 初次同步聊天桌面角标；后续由内页 store 在状态变化时主动同步。
    try {
      syncChatDesktopBadge();
    } catch (error) {
      console.warn("[studio-phone] 初始同步聊天桌面角标失败", error);
    }
  }

  onInit(): void {
    // 把包装类实例的 save 绑定到各内页 store；键名由各 store 适配器翻译。
    bindChatSave(this.save as never);
    bindAlbumSave(this.save as never);
  }

  /**
   * 卸载时释放所有等待玩家回复的门闩，避免剧情卡在 await-player-reply。
   *
   * @remarks
   * 当前 SDK 基类未声明 `onUnload` 钩子，本方法作为防御性 API 保留；
   * 若未来 SDK 增加该钩子，宿主可直接调用。同时供外部测试或手动卸载场景调用。
   */
  static onUnload(): void {
    try {
      resolveReplyWaitsForFriend();
    } catch (error) {
      console.warn("[studio-phone] 释放回复等待失败", error);
    }
  }
}

export default StudioPhoneExtension;
