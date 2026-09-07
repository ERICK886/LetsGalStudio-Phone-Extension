import { Extension, extension, type ExtensionRenderData } from "@avg-studio/sdk";
import { PhoneHudUI, type PhoneHudProps } from "../ui/phone-hud";

@extension({ id: "phone-hud", label: "手机 HUD", category: "游戏系统" })
export class PhoneHudExtension extends Extension<PhoneHudProps> {
  render(): ExtensionRenderData<PhoneHudProps> {
    return {
      component: PhoneHudUI,
      props: {
        visible: this.data?.visible === true,
        iconUrl: this.data?.iconUrl,
        position: this.data?.position || "bottom-right",
        offsetX: this.data?.offsetX ?? 0,
        offsetY: this.data?.offsetY ?? 0,
        size: this.data?.size ?? 56,
        onOpen: this.data?.onOpen ?? (() => undefined),
      },
    };
  }
}
