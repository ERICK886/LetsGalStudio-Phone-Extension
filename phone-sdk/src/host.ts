/** 手机运行宿主；不注册任何业务软件。 */
import "./host/studio/phone-inline-cards";
export { PhoneExtension, PhoneExtension as default } from "./host/phone/extension/phone-extension";
export { PhoneHudExtension } from "./host/phone/extension/phone-hud-extension";
export { ToastExtension } from "./host/toast/extension/toast-extension";
export { buildPhoneHostSettingsFields, phoneHostSaveSchema } from "./host/phone/extension/phone-host-schema";
