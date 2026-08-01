/**
 * @file phone-ui.tsx
 * @description 手机 UI 根组件：错误边界 + 内容编排。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.5.0
 */

import React from "react";
import { PhoneErrorBoundary } from "./components/phone-error-boundary";
import type { PhoneUIProps } from "../extension/phone-extension";
import { PhoneUIContent } from "./phone-ui-content";

/**
 * 对外导出的手机 UI 根组件。
 * 只应由 PhoneExtension.render 传入完整 PhoneUIProps；错误边界会隔离渲染期异常。
 */
export const PhoneUI: React.FC<PhoneUIProps> = (props) => (
  <PhoneErrorBoundary closePhone={props.closePhone}>
    <PhoneUIContent {...props} />
  </PhoneErrorBoundary>
);
