/**
 * @file inject-styles.ts
 * @description 将聊天内页 CSS 注入 document（Studio 只加载 index.mjs，不加载旁路 css）。
 * @author 池水三两升
 * @date 2026-08-05
 * @version 0.1.2
 */

const STYLE_ID = "ink.zenly.ext-7a9373-phone-chat-styles";

const CSS_TEXT = `
.chat-root {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ededed;
  color: #111;
  font-family: "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;
}
.chat-root *,
.chat-root *::before,
.chat-root *::after { box-sizing: border-box; }
.chat-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  background: #ededed;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.chat-header h1 {
  margin: 0;
  flex: 1;
  font-size: 17px;
  font-weight: 650;
  text-align: center;
}
.chat-back {
  border: none;
  background: transparent;
  color: #576b95;
  font-size: 15px;
  padding: 4px 0;
  cursor: pointer;
  min-width: 48px;
  text-align: left;
}
.chat-header-spacer { min-width: 48px; }
.chat-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}
.chat-tabs {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: #f7f7f7;
}
.chat-tab {
  box-sizing: border-box;
  width: 100%;
  border: none;
  background: transparent;
  padding: 6px 8px 8px;
  font-size: 11px;
  color: #666;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-align: center;
}
.chat-tab-icon {
  display: block;
  width: 24px;
  height: 24px;
  margin: 0 auto;
  flex: 0 0 auto;
}
.chat-tab > span {
  display: block;
  line-height: 1.2;
}
.chat-tab[data-active="true"] {
  color: #07c160;
  font-weight: 650;
}
.chat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  text-align: left;
  cursor: pointer;
}
.chat-row:active { background: #f0f0f0; }
.chat-avatar {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  background: #c8c8c8;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 18px;
}
.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.chat-row-main { flex: 1 1 auto; min-width: 0; }
.chat-row-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}
.chat-row-sub {
  margin-top: 4px;
  font-size: 13px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #fa5151;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}
.chat-empty {
  padding: 48px 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}
.chat-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ebebeb;
}
.chat-log {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 12px 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.chat-msg {
  display: flex;
  width: 100%;
  gap: 8px;
  align-items: flex-start;
}
.chat-msg[data-direction="outgoing"] { flex-direction: row-reverse; }
.chat-msg-col {
  max-width: 72%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.chat-msg[data-direction="outgoing"] .chat-msg-col { align-items: flex-end; }
.chat-msg-sender {
  max-width: 100%;
  padding: 0 2px;
  color: #777;
  font-size: 11px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-bubble {
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 15px;
  line-height: 1.45;
  word-break: break-word;
  background: #fff;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.04);
}
.chat-msg[data-direction="outgoing"] .chat-bubble { background: #95ec69; }
.chat-bubble-img {
  display: block;
  max-width: 180px;
  max-height: 180px;
  border-radius: 4px;
  object-fit: cover;
}
.chat-bubble:has(.chat-bubble-img) {
  padding: 4px;
  line-height: 0;
}
.chat-status { font-size: 11px; color: #888; }
.chat-status[data-error="true"] { color: #fa5151; }
.chat-msg[data-animate="true"] {
  animation: chat-msg-enter 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes chat-msg-enter {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.chat-replies {
  flex: 0 0 auto;
  padding: 8px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f7f7f7;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.chat-reply-btn {
  border: none;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fff;
  color: #111;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
}
.chat-reply-btn:active { background: #e9e9e9; }
.chat-reply-btn[data-content-type="image"] {
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-reply-thumb {
  display: block;
  width: 48px;
  height: 48px;
  border-radius: 4px;
  object-fit: cover;
}
.chat-detail {
  background: #ededed;
  min-height: 100%;
  padding-bottom: 24px;
}
.chat-detail-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 16px 20px;
  background: #fff;
  margin-bottom: 10px;
}
.chat-detail-hero .chat-avatar {
  width: 72px;
  height: 72px;
  font-size: 28px;
}
.chat-detail-name { font-size: 20px; font-weight: 700; }
.chat-detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  font-size: 15px;
}
.chat-detail-label { color: #666; }
.chat-detail-value {
  color: #111;
  text-align: right;
  word-break: break-all;
}
.chat-detail-actions { padding: 16px; }
.chat-primary {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 12px 14px;
  background: #07c160;
  color: #fff;
  font-size: 16px;
  font-weight: 650;
  cursor: pointer;
}
`;

/**
 * 注入或同步样式表。
 *
 * 若页面已存在同 id 的 `<style>`，会更新其 `textContent`，避免热更新 /
 * 重新构建后仍残留旧 CSS（例如 Tab 未纵向布局导致图标与文字横排错位）。
 *
 * @returns void
 *
 * @example
 * ```ts
 * ensureChatStyles();
 * ```
 */
export function ensureChatStyles(): void {
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
