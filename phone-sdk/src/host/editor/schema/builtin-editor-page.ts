/** Legacy adapters apply only to their owning section, never an arbitrary page ID. */
export function builtinEditorPage(sectionId: string, pageId: string | undefined, settingsModuleId = sectionId): "desktop" | "chat" | undefined {
  if (settingsModuleId !== sectionId) return undefined;
  if (sectionId === "phone" && pageId === "desktop-apps") return "desktop";
  if (sectionId === "phone" && pageId === "story-role-presets") return "chat";
  if (sectionId === "phone-chat" && ["chat-friends", "chat-groups", "chat-attributes"].includes(pageId ?? "")) return "chat";
  return undefined;
}
