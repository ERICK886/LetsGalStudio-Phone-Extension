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

const STYLE_ID = "ink.zenly.ext-7a9373-phone-album-styles";

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
  overflow: hidden;
}
.pa-root *,
.pa-root *::before,
.pa-root *::after { box-sizing: border-box; }

.pa-main {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pa-main > .pa-stage,
.pa-main > .pa-camera {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

/* 底部 TabBar */
.pa-tabbar {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 6px 10px calc(8px + var(--phone-safe-bottom, env(safe-area-inset-bottom, 0px)));
  background: rgba(12, 16, 22, 0.96);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 5;
}
.pa-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 48px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
  cursor: pointer;
  padding: 6px 4px;
}
.pa-tab i {
  font-size: 18px;
  line-height: 1;
}
.pa-tab.is-active {
  color: #7ec8ff;
  background: rgba(126, 200, 255, 0.1);
}
.pa-tab:active { opacity: 0.75; }

/* 拍照界面 */
.pa-camera {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #05070a;
  color: #fff;
}
.pa-camera-top {
  flex: 0 0 auto;
  padding: 12px 16px 8px;
  text-align: center;
}
.pa-camera-top-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 650;
}
.pa-camera-top-title i { color: #9ad4ff; }
.pa-camera-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
}
.pa-camera-viewfinder {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  margin: 8px 14px;
  border-radius: 18px;
  overflow: hidden;
  background:
    radial-gradient(ellipse at center, rgba(40, 52, 68, 0.55), rgba(8, 10, 14, 0.95)),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 31px,
      rgba(255, 255, 255, 0.03) 32px
    );
}
.pa-camera-grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  pointer-events: none;
  opacity: 0.35;
}
.pa-camera-grid span {
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.pa-camera-grid span:nth-child(3n) { border-right: none; }
.pa-camera-grid span:nth-last-child(-n + 3) { border-bottom: none; }
.pa-camera-frame {
  position: absolute;
  inset: 14px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}
.pa-camera-flash {
  position: absolute;
  inset: 0;
  background: #fff;
  animation: pa-flash 180ms ease-out both;
  pointer-events: none;
}
@keyframes pa-flash {
  from { opacity: 0.85; }
  to { opacity: 0; }
}
.pa-camera-controls {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 10px 18px 16px;
  gap: 12px;
}
.pa-camera-thumb {
  width: 48px;
  height: 48px;
  justify-self: start;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.45);
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.pa-camera-thumb:disabled {
  opacity: 0.4;
  cursor: default;
}
.pa-camera-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pa-camera-controls-spacer { width: 48px; justify-self: end; }

.pa-shutter {
  position: relative;
  width: 76px;
  height: 76px;
  border: none;
  border-radius: 50%;
  background: transparent;
  padding: 0;
  cursor: pointer;
  justify-self: center;
}
.pa-shutter-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.92);
  box-sizing: border-box;
}
.pa-shutter-core {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: #fff;
  transition: transform 120ms ease, background 120ms ease;
}
.pa-shutter:active:not(:disabled) .pa-shutter-core {
  transform: scale(0.9);
  background: #e8e8e8;
}
.pa-shutter.is-busy,
.pa-shutter:disabled {
  opacity: 0.55;
  cursor: default;
}

/* 页面过渡舞台 */
.pa-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.pa-page {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #0f1419;
  will-change: transform, opacity;
}
.pa-page-steady {
  position: absolute;
  inset: 0;
}
.pa-page-enter-forward {
  z-index: 2;
  animation: pa-slide-in-right 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.pa-page-exit-forward {
  z-index: 1;
  animation: pa-slide-out-left 280ms cubic-bezier(0.4, 0, 0.2, 1) both;
  pointer-events: none;
}
.pa-page-enter-back {
  z-index: 1;
  animation: pa-slide-in-left 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.pa-page-exit-back {
  z-index: 2;
  animation: pa-slide-out-right 280ms cubic-bezier(0.4, 0, 0.2, 1) both;
  pointer-events: none;
}
.pa-page-enter-crossfade {
  z-index: 2;
  animation: pa-fade-in 220ms ease both;
}
.pa-page-exit-crossfade {
  z-index: 1;
  animation: pa-fade-out 220ms ease both;
  pointer-events: none;
}

@keyframes pa-slide-in-right {
  from { transform: translateX(28%); opacity: 0.35; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes pa-slide-out-left {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-12%); opacity: 0.2; }
}
@keyframes pa-slide-in-left {
  from { transform: translateX(-18%); opacity: 0.35; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes pa-slide-out-right {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(28%); opacity: 0.15; }
}
@keyframes pa-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pa-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .pa-page-enter-forward,
  .pa-page-exit-forward,
  .pa-page-enter-back,
  .pa-page-exit-back,
  .pa-page-enter-crossfade,
  .pa-page-exit-crossfade {
    animation-duration: 1ms !important;
  }
}

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
.pa-header-right {
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.pa-header-action {
  border: none;
  background: transparent;
  color: #4ea1ff;
  font-size: 16px;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 8px;
  line-height: 1;
}
.pa-header-action:active { opacity: 0.7; }
.pa-header-action-danger { color: #ff6b7a; }

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
.pa-tile-wrap {
  position: relative;
  width: 100%;
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
  display: block;
}
.pa-tile:active { opacity: 0.85; }
.pa-tile-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #ff8a96;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}
.pa-tile-delete:active {
  background: rgba(0, 0, 0, 0.75);
  color: #ffb3bb;
}
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
.pa-tile .pa-tile-fallback-video {
  background: linear-gradient(160deg, #1a2330, #121820);
}
.pa-tile .pa-tile-fallback-play {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  padding-left: 2px;
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

/* 手机风视频播放器 */
.pa-video-player {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #000;
  cursor: pointer;
}
.pa-video-player > video {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: #000;
}
.pa-vctrl {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.72));
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms ease;
}
.pa-video-player.is-controls .pa-vctrl {
  opacity: 1;
  pointer-events: auto;
}
.pa-vctrl-play,
.pa-vctrl-mute {
  flex: 0 0 auto;
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}
.pa-vctrl-seek {
  flex: 1 1 auto;
  min-width: 0;
  accent-color: #7ec8ff;
}
.pa-vctrl-time {
  flex: 0 0 auto;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pa-album-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
