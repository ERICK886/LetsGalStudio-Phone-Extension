/**
 * @file shortcut-utils.ts
 * @description 快捷键字符串解析与展示工具（无 React 依赖）。
 * @author 池水三两升
 * @date 2026-08-10
 * @version 0.1.0
 */

const MODIFIER_ORDER = ["Ctrl", "Shift", "Alt", "Meta"] as const;

type ModifierKey = (typeof MODIFIER_ORDER)[number];

/**
 * 将 KeyboardEvent.code 的修饰键规约为统一名。
 *
 * @param code - event.code
 * @returns 修饰键名或 null
 */
export function modifierFromCode(code: string): ModifierKey | null {
  if (code === "ControlLeft" || code === "ControlRight") return "Ctrl";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "AltLeft" || code === "AltRight") return "Alt";
  if (code === "MetaLeft" || code === "MetaRight") return "Meta";
  return null;
}

/**
 * 判断是否为可作主键的 code（排除纯修饰键）。
 *
 * @param code - event.code
 * @returns true 表示可作为主键
 */
export function isMainKeyCode(code: string): boolean {
  return modifierFromCode(code) === null;
}

/**
 * 从 keydown 事件生成快捷键字符串。
 *
 * @param event - 含 code / 修饰键状态的键盘事件
 * @returns 如 Ctrl+KeyP；仅修饰键时返回 null
 */
export function shortcutFromKeyboardEvent(event: {
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): string | null {
  if (!isMainKeyCode(event.code)) {
    return null;
  }

  const mods: ModifierKey[] = [];
  if (event.ctrlKey) mods.push("Ctrl");
  if (event.shiftKey) mods.push("Shift");
  if (event.altKey) mods.push("Alt");
  if (event.metaKey) mods.push("Meta");

  const ordered = MODIFIER_ORDER.filter((m) => mods.includes(m));
  return [...ordered, event.code].join("+");
}

/**
 * 将主键 code 转为展示用短标签。
 *
 * @param code - KeyboardEvent.code 或 shortcut 最后一段
 * @returns 展示文案（如 ↑、P）
 */
export function displayKeyLabel(code: string): string {
  const map: Record<string, string> = {
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Space: "Space",
    Escape: "Esc",
    Enter: "Enter",
    Tab: "Tab",
    Backspace: "⌫",
    Delete: "Del",
    Insert: "Ins",
    Home: "Home",
    End: "End",
    PageUp: "PgUp",
    PageDown: "PgDn",
  };

  if (map[code]) return map[code];

  if (code.startsWith("Key") && code.length === 4) {
    return code.slice(3);
  }
  if (code.startsWith("Digit") && code.length === 6) {
    return code.slice(5);
  }
  if (/^F\d{1,2}$/.test(code)) {
    return code;
  }

  return code;
}

/**
 * 将快捷键字符串拆成展示芯片文案。
 *
 * @param value - 如 Ctrl+ArrowUp
 * @returns 芯片文案列表
 */
export function shortcutToChips(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  const parts = trimmed.split("+").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return [];

  const chips: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!;
    if (
      i < parts.length - 1 &&
      (MODIFIER_ORDER as readonly string[]).includes(part)
    ) {
      chips.push(part);
    } else {
      chips.push(displayKeyLabel(part));
    }
  }
  return chips;
}
