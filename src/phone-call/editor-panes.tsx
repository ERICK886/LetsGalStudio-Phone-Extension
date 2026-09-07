import { useExtensionContext } from "@avg-studio/sdk";
import {
  PhoneCallPreview,
  PhoneContentList,
  PhonePropertyPanel,
  writeModuleSetting,
  type PhoneEditorContentItemSchema,
  type PhoneEditorCustomPanes,
} from "@ink-zenly/phone-sdk";
import React from "react";
import { PHONE_CALL_EDITOR_SCHEMA } from "./editor-schema";
import {
  PhoneContactPropertyPanel,
  PhoneContactsCenter,
  PhoneContactsList,
} from "./editor-contacts";

const selectedByPage = new Map<string, string>();

function itemsForPage(pageId: string): PhoneEditorContentItemSchema[] {
  const page = PHONE_CALL_EDITOR_SCHEMA.pages.find((item) => item.id === pageId);
  const allowed = new Set(page?.contentItemIds ?? []);
  return PHONE_CALL_EDITOR_SCHEMA.contentItems.filter((item) => allowed.has(item.id));
}

function EditorRight(props: {
  selectedId: string;
  values: Record<string, string>;
  bump: () => void;
}): React.ReactElement {
  const ctx = useExtensionContext();
  return (
    <PhonePropertyPanel
      selectedId={props.selectedId}
      values={props.values}
      items={PHONE_CALL_EDITOR_SCHEMA.contentItems}
      settingsModuleId={PHONE_CALL_EDITOR_SCHEMA.settingsModuleId}
      onChange={(id, value) => {
        const item = PHONE_CALL_EDITOR_SCHEMA.contentItems.find((entry) => entry.id === id);
        if (!item) return;
        const payload = item.fieldType === "boolean" ? value === "true" : value;
        if (writeModuleSetting(ctx, item.settingsModuleId ?? PHONE_CALL_EDITOR_SCHEMA.settingsModuleId, item.settingKey ?? item.id, payload)) {
          props.bump();
        }
      }}
    />
  );
}

/** 电话 APP 自带三栏，避免预览依赖宿主对业务 preview kind 的静态识别。 */
export function resolvePhoneCallEditorPanes(args: {
  pageId: string;
  values: Record<string, string>;
  revision: number;
  bump: () => void;
}): PhoneEditorCustomPanes {
  if (args.pageId === "call-contacts") {
    return {
      left: <PhoneContactsList bump={args.bump} />,
      center: <PhoneContactsCenter />,
      right: <PhoneContactPropertyPanel bump={args.bump} />,
    };
  }
  const items = itemsForPage(args.pageId);
  const remembered = selectedByPage.get(args.pageId);
  const selectedId = items.some((item) => item.id === remembered)
    ? remembered!
    : (items[0]?.id ?? "");

  return {
    left: (
      <PhoneContentList
        selectedId={selectedId}
        items={items}
        onSelect={(id) => {
          selectedByPage.set(args.pageId, id);
          args.bump();
        }}
      />
    ),
    center: (
      <PhoneCallPreview
        values={args.values}
        pageId={args.pageId}
        refreshToken={args.revision}
      />
    ),
    right: (
      <EditorRight
        selectedId={selectedId}
        values={args.values}
        bump={args.bump}
      />
    ),
  };
}
