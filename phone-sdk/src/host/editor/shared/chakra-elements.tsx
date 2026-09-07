/**
 * @file chakra-elements.tsx
 * @description 手机编辑器使用的语义化 Chakra Factory 元素。
 * @author 池水三两升
 * @date 2026-08-30
 * @version 0.1.0
 *
 * @remarks
 * 编辑器中的复杂选择器和预览式列表需要保留原有 DOM 语义、ref 类型与
 * 精细内联样式。统一从这里导出 Chakra Factory 元素，可在不改变交互的
 * 前提下接入 Chakra 的样式系统与 Provider；运行时手机预览不使用本模块。
 */

import { chakra } from "@chakra-ui/react";

export const ChakraButton = chakra.button;
export const ChakraCode = chakra.code;
export const ChakraDiv = chakra.div;
export const ChakraHeader = chakra.header;
export const ChakraIcon = chakra.i;
export const ChakraImage = chakra.img;
export const ChakraInput = chakra.input;
export const ChakraLabel = chakra.label;
export const ChakraNav = chakra.nav;
export const ChakraOption = chakra.option;
export const ChakraSection = chakra.section;
export const ChakraSelect = chakra.select;
export const ChakraSpan = chakra.span;
export const ChakraTextarea = chakra.textarea;
