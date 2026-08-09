/**
 * @file inject-styles.ts
 * @description 将相册内页 scoped CSS 注入 document（Studio 只加载 index.mjs）。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 *
 * @remarks
 * - 所有 class 前缀 `pa-`，避免与 chat / demo-shop 内页样式冲突。
 * - 深色底，安全区由根容器 padding 吸收（来自 useSafeAreaStyle）。
 * - 不依赖任何全局 CSS；HMR 时若 textContent 变化则同步更新。
 */

const STYLE_ID = "ext-7a9373-phone-album-styles";

const CSS_TEXT = `
.pa-root {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #0f1419;
  color: #f5f5f5;
  font-family: "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.pa-root *,
.pa-root *::before,
.pa-root *::after { box-sizing: border-box; }

.pa-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.pa-header h1 {
  margin: 0;
  flex: 1;
  font-size: 17px;
  font-weight: 650;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pa-back {
  border: none;
  background: transparent;
  color: #4ea1ff;
  font-size: 15px;
  padding: 4px 0;
  cursor: pointer;
  min-width: 48px;
  text-align: left;
}
.pa-back:disabled {
  color: rgba(255, 255, 255, 0.25);
  cursor: default;
}
.pa-header-spacer { min-width: 48px; }

.pa-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.pa-home-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 14px;
}

.pa-album-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
}
.pa-album-card:active { opacity: 0.7; }
.pa-album-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: #1c232f;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.35);
  font-size: 28px;
  font-weight: 700;
}
.pa-album-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pa-album-thumb .pa-album-glyph {
  letter-spacing: 2px;
}
.pa-album-count {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  line-height: 1.4;
}
.pa-album-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pa-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
}
@media (min-width: 420px) {
  .pa-grid { grid-template-columns: repeat(4, 1fr); }
}
.pa-tile {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border: none;
  padding: 0;
  background: #1c232f;
  cursor: pointer;
  overflow: hidden;
  border-radius: 4px;
}
.pa-tile:active { opacity: 0.85; }
.pa-tile img,
.pa-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pa-tile .pa-tile-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  background: #1c232f;
}
.pa-tile-badge {
  position: absolute;
  left: 4px;
  bottom: 4px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 10px;
  line-height: 1.4;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  pointer-events: none;
}
.pa-tile-badge svg {
  width: 10px;
  height: 10px;
  fill: currentColor;
}

.pa-empty {
  padding: 64px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  line-height: 1.6;
}

.pa-viewer {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #000;
}
.pa-viewer-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  touch-action: pan-y;
}
.pa-viewer-stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}
.pa-viewer-stage video {
  max-width: 100%;
  max-height: 100%;
}
.pa-viewer-fallback {
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 24px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  text-align: center;
}
.pa-viewer-fallback-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 22px;
}
.pa-viewer-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.pa-viewer-nav:disabled {
  opacity: 0.25;
  cursor: default;
}
.pa-viewer-nav.prev { left: 8px; }
.pa-viewer-nav.next { right: 8px; }
.pa-viewer-index {
  flex: 0 0 auto;
  padding: 8px 12px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.04);
}
`;

/**
 * 注入或同步样式表。
 *
 * 若页面已存在同 id 的 `<style>`，会按 textContent 比对同步，避免热更新残留旧 CSS。
 *
 * @returns void
 *
 * @example
 * ```ts
 * ensureAlbumStyles();
 * ```
 */
export function ensureAlbumStyles(): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (existing) {
    if (existing.textContent !== CSS_TEXT) {
      existing.textContent = CSS_TEXT;
    }
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
}
