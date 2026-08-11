/**

 * @file desktop-apps-property-panel.tsx

 * @description 「桌面应用」页右栏：编辑选中应用的 catalogApps 字段。

 * @author 池水三两升

 * @date 2026-08-10

 * @version 0.1.2

 */



import React from "react";



import { AssetUriField } from "../shared/asset-uri-field";

import { EnumSelect } from "../shared/enum-select";

import { useTheme, FONT_SIZE_TITLE } from "../theme/theme-provider";

import type { ThemeTokens } from "../theme/tokens";

import type { EditableCatalogApp } from "./desktop-apps-bridge";



/**

 * 默认动作下拉选项。

 */

export interface DesktopAppActionOption {

  id: string;

  name: string;

  kindLabel: string;

}



/**

 * DesktopAppsPropertyPanel 属性。

 */

export interface DesktopAppsPropertyPanelProps {

  app: EditableCatalogApp | null;

  /**

   * 可选动作列表；有值时「默认动作」用下拉，否则退回文本框。

   */

  actionOptions?: readonly DesktopAppActionOption[];

  /**

   * 部分字段更新。

   *

   * @param patch - 要合并的字段

   */

  onChange: (patch: Partial<EditableCatalogApp>) => void;

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

 * 桌面应用属性表单。

 *

 * @param props - DesktopAppsPropertyPanelProps

 * @returns 右栏面板

 */

export function DesktopAppsPropertyPanel({

  app,

  actionOptions = [],

  onChange,

}: DesktopAppsPropertyPanelProps): React.ReactElement {

  const { tokens } = useTheme();

  const controlStyle = controlStyleOf(tokens);



  const labelStyle: React.CSSProperties = {

    ...labelStyleBase,

    color: tokens.textSecondary,

  };



  if (!app) {

    return (

      <div

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

        请选择一个应用

      </div>

    );

  }



  return (

    <div

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

      <div

        style={{

          fontSize: FONT_SIZE_TITLE,

          fontWeight: 600,

          color: tokens.textPrimary,

        }}

      >

        {app.name || "应用属性"}

      </div>



      <Field label="应用 ID" labelStyle={labelStyle}>

        <input

          type="text"

          style={controlStyle}

          value={app.id}

          onChange={(e) => onChange({ id: e.target.value })}

        />

      </Field>



      <Field label="应用名称" labelStyle={labelStyle}>

        <input

          type="text"

          style={controlStyle}

          value={app.name}

          onChange={(e) => onChange({ name: e.target.value })}

        />

      </Field>



      <Field label="应用图标（素材 URI）" labelStyle={labelStyle}>

        <AssetUriField

          value={app.icon}

          onChange={(icon) => onChange({ icon })}

          placeholder="可空"

          ariaLabel="应用图标素材 URI"

          tokens={tokens}

        />

      </Field>



      <Field label="默认排序" labelStyle={labelStyle}>

        <input

          type="text"

          style={controlStyle}

          value={String(app.order)}

          onChange={(e) => {

            const n = Number(e.target.value);

            onChange({

              order: Number.isFinite(n)

                ? Math.max(0, Math.min(9999, Math.round(n)))

                : 0,

            });

          }}

        />

      </Field>



      <Field label="默认动作" labelStyle={labelStyle}>

        {actionOptions.length > 0 ? (

          <EnumSelect

            value={

              actionOptions.some((opt) => opt.id === app.defaultActionId)

                ? app.defaultActionId

                : actionOptions[0]!.id

            }

            onChange={(next) => onChange({ defaultActionId: next })}

            options={actionOptions.map((opt) => ({

              value: opt.id,

              label: `${opt.name}（${opt.id} · ${opt.kindLabel}）`,

            }))}

            clearable={false}

            filterable={false}

            ariaLabel="默认动作"

            placeholder="请选择"

          />

        ) : (

          <input

            type="text"

            style={controlStyle}

            value={app.defaultActionId}

            onChange={(e) => onChange({ defaultActionId: e.target.value })}

          />

        )}

      </Field>



      <BooleanField

        checked={app.preinstalled}

        onChange={(v) => onChange({ preinstalled: v })}

        label="游戏开始默认预装"

        tokens={tokens}

      />



      <BooleanField

        checked={app.enabled}

        onChange={(v) => onChange({ enabled: v })}

        label="作者默认可用"

        tokens={tokens}

      />



      <BooleanField

        checked={app.locked}

        onChange={(v) => onChange({ locked: v })}

        label="锁定玩家编辑"

        tokens={tokens}

      />



      <div

        style={{

          marginTop: "auto",

          fontSize: 11,

          color: tokens.textMuted,

          lineHeight: 1.5,

        }}

      >

        写入模块 <code>phone</code> · 键 <code>catalogApps</code>

      </div>

    </div>

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

    <div>

      <label style={labelStyle}>{label}</label>

      {children}

    </div>

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

    <label

      style={{

        display: "flex",

        alignItems: "center",

        gap: 8,

        fontSize: 12,

        color: tokens.textPrimary,

      }}

    >

      <input

        type="checkbox"

        checked={checked}

        onChange={(e) => onChange(e.target.checked)}

      />

      <span>{label}</span>

    </label>

  );

}



export default DesktopAppsPropertyPanel;


