import { useExtensionContext } from "@avg-studio/sdk";
import { chakra } from "@chakra-ui/react";
import {
  CharacterAssetSelect,
  readModuleSetting,
  useTheme,
  writeModuleSetting,
} from "@ink-zenly/phone-sdk";
import React from "react";
import { PHONE_CALL_SETTINGS_MODULE_ID } from "./editor-schema";

interface EditablePhoneContact {
  characterId: string;
  phoneNumber: string;
}

const Box = chakra.div;
const Button = chakra.button;
const Input = chakra.input;
const Label = chakra.label;
const Text = chakra.span;
let selectedContactIndex = 0;

function readContacts(ctx: ReturnType<typeof useExtensionContext>): EditablePhoneContact[] {
  const raw = readModuleSetting(
    ctx,
    PHONE_CALL_SETTINGS_MODULE_ID,
    "defaultContacts",
  );
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 80).map((item) => {
    const row = item && typeof item === "object"
      ? item as Record<string, unknown>
      : {};
    return {
      characterId: String(row.characterId ?? "").trim().slice(0, 128),
      phoneNumber: String(row.phoneNumber ?? "").trim().slice(0, 40),
    };
  });
}

function writeContacts(
  ctx: ReturnType<typeof useExtensionContext>,
  contacts: readonly EditablePhoneContact[],
): boolean {
  return writeModuleSetting(
    ctx,
    PHONE_CALL_SETTINGS_MODULE_ID,
    "defaultContacts",
    contacts.slice(0, 80).map((contact) => ({
      characterId: contact.characterId.trim().slice(0, 128),
      phoneNumber: contact.phoneNumber.trim().slice(0, 40),
    })),
  );
}

export function PhoneContactsList(props: { bump: () => void }): React.ReactElement {
  const ctx = useExtensionContext();
  const { tokens } = useTheme();
  const contacts = readContacts(ctx);
  if (contacts.length === 0) selectedContactIndex = 0;
  else selectedContactIndex = Math.min(selectedContactIndex, contacts.length - 1);

  const footerButton: React.CSSProperties = {
    flex: 1,
    height: 30,
    borderRadius: 4,
    border: `1px solid ${tokens.border}`,
    background: tokens.bgSunken,
    color: tokens.textPrimary,
    cursor: "pointer",
  };

  return (
    <Box style={{ ...shellStyle(tokens), overflow: "hidden" }}>
      <Text style={{ fontSize: 11, fontWeight: 600, color: tokens.textMuted }}>
        默认联系人
      </Text>
      <Box style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
        {contacts.length === 0 ? (
          <Box style={{ padding: 12, color: tokens.textMuted, fontSize: 12 }}>
            尚未配置联系人
          </Box>
        ) : contacts.map((contact, index) => {
          const active = index === selectedContactIndex;
          return (
            <Button
              key={index}
              type="button"
              onClick={() => {
                selectedContactIndex = index;
                props.bump();
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
                width: "100%",
                marginBottom: 4,
                padding: "8px 10px",
                borderRadius: 4,
                border: `1px solid ${active ? tokens.accent : "transparent"}`,
                background: active ? `${tokens.accent}22` : "transparent",
                color: active ? tokens.textPrimary : tokens.textSecondary,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Text style={{ fontWeight: active ? 600 : 400 }}>
                {contact.characterId || "（未选择角色）"}
              </Text>
              <Text style={{ fontSize: 10, opacity: 0.8 }}>
                {contact.phoneNumber || "未填写电话号码"}
              </Text>
            </Button>
          );
        })}
      </Box>
      <Box style={{ display: "flex", gap: 6 }}>
        <Button
          type="button"
          style={footerButton}
          onClick={() => {
            const next = [...contacts, { characterId: "", phoneNumber: "" }];
            if (writeContacts(ctx, next)) {
              selectedContactIndex = next.length - 1;
              props.bump();
            }
          }}
        >
          ＋ 添加
        </Button>
        <Button
          type="button"
          disabled={contacts.length === 0}
          style={{ ...footerButton, opacity: contacts.length ? 1 : 0.5 }}
          onClick={() => {
            if (contacts.length === 0) return;
            const next = contacts.filter((_, index) => index !== selectedContactIndex);
            if (writeContacts(ctx, next)) {
              selectedContactIndex = Math.max(0, selectedContactIndex - 1);
              props.bump();
            }
          }}
        >
          删除
        </Button>
      </Box>
    </Box>
  );
}

export function PhoneContactPropertyPanel(props: { bump: () => void }): React.ReactElement {
  const ctx = useExtensionContext();
  const { tokens } = useTheme();
  const contacts = readContacts(ctx);
  const contact = contacts[selectedContactIndex];
  const controlStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "7px 9px",
    borderRadius: 4,
    border: `1px solid ${tokens.border}`,
    background: tokens.bgSunken,
    color: tokens.textPrimary,
    fontSize: 13,
  };

  if (!contact) {
    return <Box style={shellStyle(tokens)}>请先添加一个联系人</Box>;
  }

  const update = (patch: Partial<EditablePhoneContact>) => {
    const next = contacts.map((item, index) =>
      index === selectedContactIndex ? { ...item, ...patch } : item,
    );
    if (writeContacts(ctx, next)) props.bump();
  };

  return (
    <Box style={{ ...shellStyle(tokens), overflow: "auto" }}>
      <Field label="角色" color={tokens.textSecondary}>
        <CharacterAssetSelect
          value={contact.characterId}
          onChange={(characterId) => update({ characterId })}
          emptyLabel="（未选择角色）"
        />
      </Field>
      <Field label="电话号码" color={tokens.textSecondary}>
        <Input
          type="tel"
          value={contact.phoneNumber}
          onChange={(event) => update({ phoneNumber: event.target.value })}
          placeholder="例如 10086"
          style={controlStyle}
        />
      </Field>
      <Box style={{ color: tokens.textMuted, fontSize: 11, lineHeight: 1.5 }}>
        数字拨号会按电话号码查找角色；通讯录与最近通话仍以角色为目标。
      </Box>
      <Box style={{ marginTop: "auto", color: tokens.textMuted, fontSize: 11 }}>
        写入 phone-call · defaultContacts
      </Box>
    </Box>
  );
}

export function PhoneContactsCenter(): React.ReactElement {
  const { tokens } = useTheme();
  return (
    <Box
      style={{
        ...shellStyle(tokens),
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: 600 }}>通讯录配置</Text>
      <Text style={{ maxWidth: 280, color: tokens.textMuted, lineHeight: 1.6 }}>
        在左侧管理联系人，在右侧选择项目角色并填写可拨打的号码。
      </Text>
    </Box>
  );
}

function Field(props: {
  label: string;
  color: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Box>
      <Label style={{ display: "block", marginBottom: 6, color: props.color, fontSize: 11, fontWeight: 600 }}>
        {props.label}
      </Label>
      {props.children}
    </Box>
  );
}

function shellStyle(
  tokens: ReturnType<typeof useTheme>["tokens"],
): React.CSSProperties {
  return {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 10,
    background: tokens.bgElevated,
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    color: tokens.textPrimary,
  };
}
