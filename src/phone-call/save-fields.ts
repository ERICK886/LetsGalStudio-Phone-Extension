import type { SaveSchema } from "@avg-studio/sdk";
import type { CallRecord, OutgoingStoryDefinition } from "./types";

export const phoneCallSaveFields = {
  contactsExtra: { type: "list", persistence: "slot", default: [] as string[], label: "动态联系人" },
  contactsRemoved: { type: "list", persistence: "slot", default: [] as string[], label: "隐藏联系人" },
  records: { type: "list", persistence: "slot", default: [] as CallRecord[], label: "通话记录" },
  outgoingStories: { type: "list", persistence: "slot", default: [] as OutgoingStoryDefinition[], label: "自主拨号剧情" },
} as const satisfies SaveSchema;
