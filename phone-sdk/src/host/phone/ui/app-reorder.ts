/**
 * @file app-reorder.ts
 * @description 桌面 APP 长按拖拽排序类型与诊断。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */


export type AppDropPlacement = "before" | "after";

export interface AppDropTarget {
  appId: string;
  placement: AppDropPlacement;
}

export interface AppDragStart {
  appId: string;
  pointerId: number;
  clientX: number;
  clientY: number;
}

/** 普通手机桌面应用排序的运行时诊断。 */
export function appReorderDebug(event: string, details: Record<string, unknown>): void {
  console.log(`[phone-debug] app-reorder-${event}`, details);
}
