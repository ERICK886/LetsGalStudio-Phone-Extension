/**
 * @file phone-editor-extension.tsx
 * @description 手机编辑器程序模块：作者侧样式编辑外壳（第一版仅 chrome）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 *
 * @remarks
 * - 程序 id：`phone-editor`；与宿主扩展包 id 不同。
 * - 实现位于 `@ink-zenly/phone-sdk` 的 `host/editor/`，由宿主包 re-export。
 * - 无 saveSchema / Fragment 方法；不是手机内页 APP（不进 bootstrapPhonePluginApps）。
 */

import {
  Extension,
  extension,
  settings,
  type ExtensionRenderData,
} from "@avg-studio/sdk";

import { MODULE_LABEL, PROGRAM_ID } from "./constants";
import { PhoneEditorApp } from "./app/phone-editor-app";

/**
 * 手机编辑器扩展控制器。
 *
 * @remarks
 * Studio「显示界面」可选本程序；render 输出全屏编辑器外壳。
 */
@extension({
  id: PROGRAM_ID,
  label: MODULE_LABEL,
  category: "游戏系统",
})
export class PhoneEditorExtension extends Extension {
  /**
   * 壳级设置：主题与左右栏宽度。
   */
  static settings = settings((s) => ({
    theme: s
      .enum("界面主题", ["light", "dark"] as const)
      .labels({ light: "浅色", dark: "深色" })
      .default("dark"),
    editorLeftWidth: s
      .number("编辑器左栏宽度")
      .default(260)
      .range(180, 480),
    editorRightWidth: s
      .number("编辑器右栏宽度")
      .default(300)
      .range(220, 520),
  }));

  /**
   * 渲染编辑器 UI。
   *
   * @returns ExtensionRenderData
   */
  render(): ExtensionRenderData {
    return {
      component: PhoneEditorApp,
      props: {},
    };
  }
}

export default PhoneEditorExtension;
