/**
 * @file types.ts
 * @description Phone SDK 公共类型：应用注册描述、render props、安全区与宿主接口。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.1
 */

import type { ReactNode } from "react";

/**
 * 手机屏幕安全区（单位：CSS 像素，相对手机屏幕内容区）。
 *
 * - `top`：状态栏 + 刘海 / 灵动岛占用高度
 * - `bottom`：底部 Home 指示条 / 手势条占用高度
 * - `left` / `right`：左右圆角或预留边距（当前宿主多为 0）
 *
 * @example
 * ```tsx
 * render: ({ safeAreaInsets }) => (
 *   <div style={{ paddingTop: safeAreaInsets.top, paddingBottom: safeAreaInsets.bottom }}>
 *     ...
 *   </div>
 * )
 * ```
 */
export interface PhoneSafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 传给第三方 `render` 的运行时 props。
 *
 * @property appId 注册时的应用 id
 * @property closeApp 返回手机桌面（不关闭手机外壳）
 * @property closePhone 关闭整部手机 UI
 * @property safeAreaInsets 刘海/状态栏与底部 Home 等安全区像素
 *
 * @remarks
 * 宿主同时会在内页容器上写入 CSS 变量：
 * `--phone-safe-top` / `--phone-safe-right` / `--phone-safe-bottom` / `--phone-safe-left`（带 `px` 单位）。
 */
export interface PhoneAppRenderProps {
  appId: string;
  closeApp: () => void;
  closePhone: () => void;
  safeAreaInsets: PhoneSafeAreaInsets;
}

/**
 * 第三方通过 `registerPhoneApp` 提交的应用描述。
 *
 * @property id 稳定 id，必须与 Studio 程序 ID（`@extension({ id })`）一致；
 *   同一扩展可注册多个 app（每个程序模块各注册一次）。作者设置的 `phoneAppId` 填同一程序 ID，
 *   也可填 Studio 引用 `扩展ID/程序ID`（宿主会规约为程序 ID）。
 * @property title 可选展示名（宿主可不显示顶栏，供调试/无障碍）
 * @property description 可选说明
 * @property render 返回要嵌在手机屏幕内的 React 节点
 */
export interface PhoneAppRegistration {
  id: string;
  title?: string;
  description?: string;
  render: (props: PhoneAppRenderProps) => ReactNode;
}

/**
 * 手机扩展安装的宿主实现。
 * SDK 客户端只通过该接口读写注册表，不直接操作 DOM。
 */
export interface PhoneSdkHost {
  /**
   * 注册或覆盖同 id 应用。
   *
   * @param app 已通过客户端校验的注册对象
   */
  registerApp(app: PhoneAppRegistration): void;

  /**
   * 按 id 注销应用；不存在时应为 no-op。
   *
   * @param id 应用 id
   */
  unregisterApp(id: string): void;

  /**
   * 查询已注册应用。
   *
   * @param id 应用 id
   * @returns 注册对象；未找到时为 `undefined`
   */
  getApp(id: string): PhoneAppRegistration | undefined;

  /**
   * 列出当前全部已注册应用（只读快照）。
   *
   * @returns 应用列表副本
   */
  listApps(): readonly PhoneAppRegistration[];
}

/**
 * 挂在 `globalThis` 上的 SDK 槽位形状。
 * 所有扩展 bundle 必须共享同一槽位，因此队列与宿主都不能放在模块私有变量里。
 */
export interface PhoneSdkGlobalSlot {
  host?: PhoneSdkHost;
  /** 宿主安装前暂存的注册请求 */
  queue: PhoneAppRegistration[];
  /** 宿主安装前暂存的注销 id */
  unregisterQueue: string[];
  /** 宿主最近一次发布的安全区；未发布时为 `undefined` */
  safeAreaInsets?: PhoneSafeAreaInsets;
}
