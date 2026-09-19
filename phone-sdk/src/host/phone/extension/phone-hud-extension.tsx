import { Extension, extension, type ExtensionRenderData } from "@avg-studio/sdk";
import { PhoneHudUI, type PhoneHudProps } from "../ui/phone-hud";

@extension({ id: "phone-hud", label: "手机 HUD", category: "游戏系统" })
export class PhoneHudExtension extends Extension<PhoneHudProps> {
  render(): ExtensionRenderData<PhoneHudProps> {
    return {
      component: PhoneHudUI,
      props: {
        visible: this.data?.visible === true,
        buttonType: this.data?.buttonType ?? "icon",
        text: this.data?.text ?? "打开手机",
        iconPreset: this.data?.iconPreset ?? "phone",
        iconUrl: this.data?.iconUrl,
        imageUrl: this.data?.imageUrl,
        backgroundImageUrl: this.data?.backgroundImageUrl,
        stylePreset: this.data?.stylePreset ?? "dark-glass",
        backgroundColor: this.data?.backgroundColor,
        textColor: this.data?.textColor,
        borderColor: this.data?.borderColor,
        borderWidth: this.data?.borderWidth ?? 1,
        borderRadius: this.data?.borderRadius ?? 16,
        position: this.data?.position || "bottom-right",
        offsetX: this.data?.offsetX ?? 0,
        offsetY: this.data?.offsetY ?? 0,
        size: this.data?.size ?? 56,
        width: this.data?.width ?? 0,
        contentSize: this.data?.contentSize ?? 0,
        onOpen: this.data?.onOpen ?? (() => undefined),
      },
    };
  }
}
