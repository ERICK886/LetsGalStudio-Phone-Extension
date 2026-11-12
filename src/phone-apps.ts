/** 本扩展的软件清单。控制器由 index.tsx 单独导出给 Studio。 */
import { registerPhonePlugin } from "@ink-zenly/phone-sdk/plugin";
import { registerChatPhoneApp } from "./phone-chat/ui/register";
import { registerPhoneAlbumPhoneApp } from "./phone-album/ui/register";
import { registerPhoneCallApp } from "./phone-call/ui";

export const phoneApps = [registerChatPhoneApp, registerPhoneAlbumPhoneApp, registerPhoneCallApp];
export const disposePhoneApps = registerPhonePlugin({
  extensionId: __PHONE_HOST_EXTENSION_ID__ ?? "ink.zenly.ext-7a9373",
  apps: phoneApps,
});
