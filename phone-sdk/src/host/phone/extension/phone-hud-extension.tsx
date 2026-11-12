import { Extension, extension, type ExtensionProps, type ExtensionRenderData } from "@avg-studio/sdk";

const RetiredPhoneHud = () => null;

/** @deprecated HUD now lives in PhoneExtension. Keep the module ID for existing host exports. */
@extension({ id: "phone-hud", label: "手机 HUD", category: "游戏系统", exposeUI: false })
export class PhoneHudExtension extends Extension {
  render(): ExtensionRenderData<ExtensionProps> {
    return { component: RetiredPhoneHud, props: {} };
  }
}
