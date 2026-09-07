/**

 * @file desktop-actions-property-panel.tsx

 * @description 「桌面应用」页 · 动作子页：右栏编辑选中动作。

 * @author 池水三两升

 * @date 2026-08-10

 * @version 0.1.1

 */



import React from "react";



import type { LocalCommandId } from "../../phone/catalog";

import { EnumSelect } from "../shared/enum-select";

import { useTheme, FONT_SIZE_TITLE } from "../theme/theme-provider";

import type { ThemeTokens } from "../theme/tokens";

import {

  ACTION_KIND_LABELS,

  ACTION_KIND_SETTING_KEY,

  EDITOR_LOCAL_COMMAND_OPTIONS,

  EDITOR_SYSTEM_SLOT_OPTIONS,

  type EditableCatalogAction,

} from "./desktop-actions-bridge";
import { ChakraCode, ChakraDiv, ChakraInput, ChakraLabel, ChakraSpan } from "../shared/chakra-elements";



/**

 * DesktopActionsPropertyPanel 属性。

 */

export interface DesktopActionsPropertyPanelProps {

  action: EditableCatalogAction | null;

  /**

   * 部分字段更新。

   *

   * @param patch - 要合并的字段

   */

  onChange: (patch: Partial<EditableCatalogAction>) => void;

}



const labelStyleBase: React.CSSProperties = {

  display: "block",

  fontSize: 11,

  fontWeight: 600,

  marginBottom: 6,

};



function controlStyleOf(tokens: ThemeTokens): React.CSSProperties {

  return {

    width: "100%",

    boxSizing: "border-box",

    padding: "7px 9px",

    borderRadius: 4,

    fontSize: 12,

    outline: "none",

    color: tokens.textPrimary,

    background: tokens.bgSunken,

    border: `1px solid ${tokens.border}`,

  };

}



/**

 * 动作属性表单（按 kind 显示专属字段）。

 *

 * @param props - DesktopActionsPropertyPanelProps

 * @returns 右栏面板

 */

export function DesktopActionsPropertyPanel({

  action,

  onChange,

}: DesktopActionsPropertyPanelProps): React.ReactElement {

  const { tokens } = useTheme();

  const controlStyle = controlStyleOf(tokens);



  const labelStyle: React.CSSProperties = {

    ...labelStyleBase,

    color: tokens.textSecondary,

  };



  if (!action) {

    return (

      <ChakraDiv

        style={{

          width: "100%",

          height: "100%",

          color: tokens.textMuted,

          padding: 12,

          background: tokens.bgElevated,

          border: `1px solid ${tokens.border}`,

          borderRadius: 6,

        }}

      >

        请选择一个动作

      </ChakraDiv>

    );

  }



  return (

    <ChakraDiv

      style={{

        width: "100%",

        height: "100%",

        boxSizing: "border-box",

        display: "flex",

        flexDirection: "column",

        gap: 12,

        padding: 12,

        overflow: "auto",

        background: tokens.bgElevated,

        border: `1px solid ${tokens.border}`,

        borderRadius: 6,

      }}

    >

      <ChakraDiv

        style={{

          fontSize: FONT_SIZE_TITLE,

          fontWeight: 600,

          color: tokens.textPrimary,

        }}

      >

        {action.name || "动作属性"}

      </ChakraDiv>



      <ChakraDiv

        style={{

          fontSize: 11,

          color: tokens.textMuted,

        }}

      >

        类型 · {ACTION_KIND_LABELS[action.kind]}

      </ChakraDiv>



      <Field label="动作 ID" labelStyle={labelStyle}>

        <ChakraInput

          type="text"

          style={controlStyle}

          value={action.id}

          onChange={(e) => onChange({ id: e.target.value })}

        />

      </Field>



      <Field label="名称" labelStyle={labelStyle}>

        <ChakraInput

          type="text"

          style={controlStyle}

          value={action.name}

          onChange={(e) => onChange({ name: e.target.value })}

        />

      </Field>



      <Field label="说明" labelStyle={labelStyle}>

        <ChakraInput

          type="text"

          style={controlStyle}

          value={action.description}

          onChange={(e) => onChange({ description: e.target.value })}

          placeholder="可空"

        />

      </Field>



      {action.kind === "program-ui" ? (

        <Field label="UI 引用" labelStyle={labelStyle}>

          <ChakraInput

            type="text"

            style={controlStyle}

            value={action.programUiRef}

            onChange={(e) => onChange({ programUiRef: e.target.value })}

            placeholder="ui-id 或 extension-id/ui-id"

          />

        </Field>

      ) : null}



      {action.kind === "visual-ui" ? (

        <>

          <Field label="界面名称" labelStyle={labelStyle}>

            <ChakraInput

              type="text"

              style={controlStyle}

              value={action.visualUiName}

              onChange={(e) => onChange({ visualUiName: e.target.value })}

              placeholder="ui-name 或 @extension-id/ui-name"

            />

          </Field>

          <BooleanField

            checked={action.modal}

            onChange={(v) => onChange({ modal: v })}

            label="模态打开"

            tokens={tokens}

          />

        </>

      ) : null}



      {action.kind === "system-slot" ? (

        <Field label="系统界面" labelStyle={labelStyle}>

          <EnumSelect

            value={action.systemSlot}

            onChange={(next) => onChange({ systemSlot: next })}

            options={EDITOR_SYSTEM_SLOT_OPTIONS}

            clearable={false}

            filterable={false}

            ariaLabel="系统界面"

            placeholder="请选择"

          />

        </Field>

      ) : null}



      {action.kind === "local-command" ? (

        <Field label="内部方法" labelStyle={labelStyle}>

          <EnumSelect

            value={action.commandId}

            onChange={(next) =>

              onChange({ commandId: next as LocalCommandId })

            }

            options={EDITOR_LOCAL_COMMAND_OPTIONS}

            clearable={false}

            filterable={false}

            ariaLabel="内部方法"

            placeholder="请选择"

          />

        </Field>

      ) : null}



      {action.kind === "in-phone-app" ? (

        <Field label="Phone SDK 应用 ID" labelStyle={labelStyle}>

          <ChakraInput

            type="text"

            style={controlStyle}

            value={action.phoneAppId}

            onChange={(e) => onChange({ phoneAppId: e.target.value })}

            placeholder="如 phone-chat、phone-album"

          />

        </Field>

      ) : null}



      <ChakraDiv

        style={{

          marginTop: "auto",

          fontSize: 11,

          color: tokens.textMuted,

          lineHeight: 1.5,

        }}

      >

        写入模块 <ChakraCode>phone</ChakraCode> · 键{" "}

        <ChakraCode>{ACTION_KIND_SETTING_KEY[action.kind]}</ChakraCode>

      </ChakraDiv>

    </ChakraDiv>

  );

}



/**

 * 带标签的字段容器。

 */

function Field({

  label,

  labelStyle,

  children,

}: {

  label: string;

  labelStyle: React.CSSProperties;

  children: React.ReactNode;

}): React.ReactElement {

  return (

    <ChakraDiv>

      <ChakraLabel style={labelStyle}>{label}</ChakraLabel>

      {children}

    </ChakraDiv>

  );

}



function BooleanField({

  checked,

  onChange,

  label,

  tokens,

}: {

  checked: boolean;

  onChange: (v: boolean) => void;

  label: string;

  tokens: ThemeTokens;

}): React.ReactElement {

  return (

    <ChakraLabel

      style={{

        display: "flex",

        alignItems: "center",

        gap: 8,

        fontSize: 12,

        color: tokens.textPrimary,

      }}

    >

      <ChakraInput

        type="checkbox"

        checked={checked}

        onChange={(e) => onChange(e.target.checked)}

      />

      <ChakraSpan>{label}</ChakraSpan>

    </ChakraLabel>

  );

}



export default DesktopActionsPropertyPanel;


