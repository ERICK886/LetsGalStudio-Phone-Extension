/**

 * @file album-array-panels.tsx

 * @description 相册编辑器：默认相册 / 默认媒体 列表面板与属性面板（展示型，由 Task 6 接线）。

 * @author 池水三两升

 * @date 2026-08-10

 * @version 0.1.0

 *

 * @remarks

 * - 左栏列表 + 右栏属性，样式对齐 phone-sdk `chat-array-panels`。

 * - 媒体属性含相册多选开关，勾选集映射为 `albumIds`。

 * - id 冲突合并由 panes 层处理；本文件仅抛出 patch。

 */



import React from "react";

import {

  AssetUriField,

  AssetUriThumb,

  FONT_SIZE_DEFAULT,

  useTheme,

} from "@ink-zenly/phone-sdk";



import type { EditableDefaultAlbum } from "./albums-bridge.ts";

import type { EditableDefaultMedia } from "./media-bridge.ts";

import type { MediaType } from "../types.ts";



const labelStyleBase: React.CSSProperties = {

  display: "block",

  fontSize: 11,

  fontWeight: 600,

  marginBottom: 6,

};



/** 属性区标题字号（与 phone-sdk FONT_SIZE_TITLE 一致）。 */

const FONT_SIZE_TITLE = 14;



/**

 * 通用字段容器。

 *

 * @param label - 字段标签

 * @param labelStyle - 标签样式

 * @param children - 控件

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



/**

 * 未选中条目时的右侧空状态。

 *

 * @param text - 提示文案

 */

function EmptyRight({ text }: { text: string }): React.ReactElement {

  const { tokens } = useTheme();

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

      {text}

    </div>

  );

}



/* -------------------- 默认相册 -------------------- */



/** 默认相册列表 props。 */

export interface AlbumCatalogListProps {

  /** 相册行 */

  albums: readonly EditableDefaultAlbum[];

  /** 当前选中行 uid */

  selectedUid: string;

  /** 选中变更 */

  onSelect: (uid: string) => void;

  /** 新增一行 */

  onAdd: () => void;

  /** 删除指定 uid */

  onDelete: (uid: string) => void;

}



/**

 * 默认相册左栏列表。

 *

 * @param props - 见 {@link AlbumCatalogListProps}

 */

export function AlbumCatalogList({

  albums,

  selectedUid,

  onSelect,

  onAdd,

  onDelete,

}: AlbumCatalogListProps): React.ReactElement {

  const { tokens } = useTheme();

  return (

    <ArrayListShell

      title="默认相册"

      onAdd={onAdd}

      onDelete={() => selectedUid && onDelete(selectedUid)}

      deleteDisabled={!selectedUid}

    >

      {albums.map((album) => {

        const active = album.uid === selectedUid;

        return (

          <button

            key={album.uid}

            type="button"

            onClick={() => onSelect(album.uid)}

            style={rowButtonStyle(tokens, active)}

          >

            <span style={{ fontWeight: active ? 600 : 400 }}>

              {album.name.trim() || album.id}

            </span>

            <span style={{ fontSize: 10, color: tokens.textMuted }}>

              {album.id}

            </span>

          </button>

        );

      })}

      {albums.length === 0 ? (

        <div style={{ padding: 12, color: tokens.textMuted, fontSize: 12 }}>

          暂无相册，点击下方添加。

        </div>

      ) : null}

    </ArrayListShell>

  );

}



/**

 * 默认相册右侧属性面板。

 *

 * @param album - 当前选中行；null 时显示空状态

 * @param onChange - 字段 patch（id 冲突由上层合并）

 */

export function AlbumCatalogPropertyPanel({

  album,

  onChange,

}: {

  album: EditableDefaultAlbum | null;

  onChange: (patch: Partial<EditableDefaultAlbum>) => void;

}): React.ReactElement {

  const { tokens } = useTheme();

  const labelStyle = { ...labelStyleBase, color: tokens.textSecondary };

  const controlStyle = controlStyleOf(tokens);

  if (!album) return <EmptyRight text="请选择一个相册" />;



  return (

    <RightShell title="相册属性" tokens={tokens}>

      <Field label="相册 ID" labelStyle={labelStyle}>

        <input

          type="text"

          style={controlStyle}

          value={album.id}

          onChange={(e) => onChange({ id: e.target.value })}

        />

      </Field>

      <Field label="显示名称" labelStyle={labelStyle}>

        <input

          type="text"

          style={controlStyle}

          value={album.name}

          onChange={(e) => onChange({ name: e.target.value })}

        />

      </Field>

      <Field label="封面素材" labelStyle={labelStyle}>

        <AssetUriField

          value={album.coverAsset}

          onChange={(next) => onChange({ coverAsset: next })}

          placeholder="封面图片 URI"

          ariaLabel="相册封面素材 URI"

          tokens={tokens}

        />

      </Field>

      <Hint tokens={tokens}>写入 phone-album · defaultAlbums</Hint>

    </RightShell>

  );

}



/* -------------------- 默认媒体 -------------------- */



/** 默认媒体列表 props。 */

export interface AlbumMediaListProps {

  /** 媒体行 */

  media: readonly EditableDefaultMedia[];

  /** 当前选中行 uid */

  selectedUid: string;

  /** 选中变更 */

  onSelect: (uid: string) => void;

  /** 新增一行 */

  onAdd: () => void;

  /** 删除指定 uid */

  onDelete: (uid: string) => void;

}



/**

 * 默认媒体左栏列表。

 *

 * @param props - 见 {@link AlbumMediaListProps}

 */

export function AlbumMediaList({

  media,

  selectedUid,

  onSelect,

  onAdd,

  onDelete,

}: AlbumMediaListProps): React.ReactElement {

  const { tokens } = useTheme();

  return (

    <ArrayListShell

      title="默认媒体"

      onAdd={onAdd}

      onDelete={() => selectedUid && onDelete(selectedUid)}

      deleteDisabled={!selectedUid}

    >

      {media.map((item) => {

        const active = item.uid === selectedUid;

        const thumbUri =

          item.type === "video" && item.posterAsset.trim()

            ? item.posterAsset

            : item.asset;

        return (

          <button

            key={item.uid}

            type="button"

            onClick={() => onSelect(item.uid)}

            style={{

              ...rowButtonStyle(tokens, active),

              flexDirection: "row",

              alignItems: "center",

              gap: 8,

              textAlign: "left",

            }}

          >

            <AssetUriThumb uri={thumbUri} size={28} tokens={tokens} />

            <span

              style={{

                display: "flex",

                flexDirection: "column",

                gap: 2,

                minWidth: 0,

                flex: 1,

              }}

            >

              <span style={{ fontWeight: active ? 600 : 400 }}>{item.id}</span>

              <span style={{ fontSize: 10, color: tokens.textMuted }}>

                {item.type === "video" ? "视频" : "图片"}

                {item.asset.trim() ? "" : " · 未填素材"}

              </span>

            </span>

          </button>

        );

      })}

      {media.length === 0 ? (

        <div style={{ padding: 12, color: tokens.textMuted, fontSize: 12 }}>

          暂无媒体，点击下方添加。

        </div>

      ) : null}

    </ArrayListShell>

  );

}



/**

 * 切换媒体所属相册 id 集合。

 *

 * @param current - 当前 albumIds

 * @param albumId - 目标相册 id

 * @param checked - 是否勾选

 */

function toggleMediaAlbumId(

  current: readonly string[],

  albumId: string,

  checked: boolean,

): string[] {

  if (checked) {

    if (current.includes(albumId)) return [...current];

    return [...current, albumId];

  }

  return current.filter((id) => id !== albumId);

}



/**

 * 默认媒体右侧属性面板（含相册多选）。

 *

 * @param media - 当前选中行

 * @param albums - 可选相册列表（供 checkbox）

 * @param onChange - 字段 patch

 */

export function AlbumMediaPropertyPanel({

  media,

  albums,

  onChange,

}: {

  media: EditableDefaultMedia | null;

  albums: readonly EditableDefaultAlbum[];

  onChange: (patch: Partial<EditableDefaultMedia>) => void;

}): React.ReactElement {

  const { tokens } = useTheme();

  const labelStyle = { ...labelStyleBase, color: tokens.textSecondary };

  const controlStyle = controlStyleOf(tokens);

  if (!media) return <EmptyRight text="请选择一个媒体条目" />;



  const isVideo = media.type === "video";



  return (

    <RightShell title="媒体属性" tokens={tokens}>

      <Field label="媒体 ID" labelStyle={labelStyle}>

        <input

          type="text"

          style={controlStyle}

          value={media.id}

          onChange={(e) => onChange({ id: e.target.value })}

        />

      </Field>

      <Field label="类型" labelStyle={labelStyle}>

        <select

          style={controlStyle}

          value={media.type}

          onChange={(e) => onChange({ type: e.target.value as MediaType })}

        >

          <option value="image">图片</option>

          <option value="video">视频</option>

        </select>

      </Field>

      <Field label="素材 URI" labelStyle={labelStyle}>

        <AssetUriField

          value={media.asset}

          onChange={(next) => onChange({ asset: next })}

          placeholder={isVideo ? "视频 URI" : "图片 URI"}

          ariaLabel="媒体素材 URI"

          tokens={tokens}

        />

      </Field>

      {isVideo ? (

        <>

          <Field label="封面素材" labelStyle={labelStyle}>

            <AssetUriField

              value={media.posterAsset}

              onChange={(next) => onChange({ posterAsset: next })}

              placeholder="视频封面 URI"

              ariaLabel="视频封面素材 URI"

              tokens={tokens}

            />

          </Field>

          <Field label="时长（秒）" labelStyle={labelStyle}>

            <input

              type="text"

              style={controlStyle}

              value={media.durationSec > 0 ? String(media.durationSec) : ""}

              onChange={(e) => {

                const raw = e.target.value.trim();

                onChange({

                  durationSec: raw === "" ? 0 : Number.parseFloat(raw) || 0,

                });

              }}

              placeholder="0 表示未设"

            />

          </Field>

        </>

      ) : null}

      <Field label="所属相册" labelStyle={labelStyle}>

        {albums.length === 0 ? (

          <div style={{ fontSize: 12, color: tokens.textMuted }}>

            暂无相册，请先在「默认相册」页添加。

          </div>

        ) : (

          <div

            style={{

              display: "flex",

              flexDirection: "column",

              gap: 6,

              padding: "4px 0",

            }}

          >

            {albums.map((album) => {

              const checked = media.albumIds.includes(album.id);

              const label = album.name.trim() || album.id;

              return (

                <div

                  key={album.uid}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    flexWrap: "wrap",

                    gap: "4px 6px",

                  }}

                >

                  <label

                    style={{

                      display: "flex",

                      alignItems: "center",

                      gap: 8,

                      fontSize: FONT_SIZE_DEFAULT,

                      color: tokens.textPrimary,

                    }}

                  >

                    <input

                      type="checkbox"

                      checked={checked}

                      onChange={(e) =>

                        onChange({

                          albumIds: toggleMediaAlbumId(

                            media.albumIds,

                            album.id,

                            e.target.checked,

                          ),

                        })

                      }

                    />

                    <span>{label}</span>

                  </label>

                  {album.name.trim() ? (

                    <span

                      style={{

                        fontSize: 10,

                        color: tokens.textMuted,

                      }}

                    >

                      {album.id}

                    </span>

                  ) : null}

                </div>

              );

            })}

          </div>

        )}

      </Field>

      <Hint tokens={tokens}>写入 phone-album · defaultMedia</Hint>

    </RightShell>

  );

}



/* -------------------- 布局零件 -------------------- */



/**

 * 左栏列表外壳：标题 + 滚动区 + 增删按钮。

 */

function ArrayListShell({

  title,

  children,

  onAdd,

  onDelete,

  deleteDisabled,

}: {

  title: string;

  children: React.ReactNode;

  onAdd: () => void;

  onDelete: () => void;

  deleteDisabled: boolean;

}): React.ReactElement {

  const { tokens } = useTheme();

  return (

    <div

      style={{

        width: "100%",

        height: "100%",

        boxSizing: "border-box",

        display: "flex",

        flexDirection: "column",

        gap: 8,

        padding: 4,

        overflow: "hidden",

        background: tokens.bgElevated,

        border: `1px solid ${tokens.border}`,

        borderRadius: 6,

      }}

    >

      <div

        style={{

          fontSize: 11,

          fontWeight: 600,

          letterSpacing: 0.4,

          color: tokens.textMuted,

          padding: "4px 8px 0",

          textTransform: "uppercase",

        }}

      >

        {title}

      </div>

      <div

        style={{

          flex: "1 1 auto",

          minHeight: 0,

          overflow: "auto",

          display: "flex",

          flexDirection: "column",

          gap: 4,

        }}

      >

        {children}

      </div>

      <div style={{ display: "flex", gap: 6, padding: "0 4px 4px" }}>

        <button type="button" onClick={onAdd} style={footerBtn(tokens, false)}>

          添加

        </button>

        <button

          type="button"

          disabled={deleteDisabled}

          onClick={onDelete}

          style={footerBtn(tokens, deleteDisabled)}

        >

          删除

        </button>

      </div>

    </div>

  );

}



/**

 * 右侧属性面板外壳。

 */

function RightShell({

  title,

  tokens,

  children,

}: {

  title: string;

  tokens: ReturnType<typeof useTheme>["tokens"];

  children: React.ReactNode;

}): React.ReactElement {

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

        {title}

      </div>

      {children}

    </div>

  );

}



/** 底部 settings 写入提示。 */

function Hint({

  tokens,

  children,

}: {

  tokens: ReturnType<typeof useTheme>["tokens"];

  children: React.ReactNode;

}): React.ReactElement {

  return (

    <div

      style={{

        marginTop: "auto",

        fontSize: 11,

        color: tokens.textMuted,

        lineHeight: 1.5,

      }}

    >

      {children}

    </div>

  );

}



/** 文本/下拉控件统一样式。 */

function controlStyleOf(

  tokens: ReturnType<typeof useTheme>["tokens"],

): React.CSSProperties {

  return {

    width: "100%",

    boxSizing: "border-box",

    padding: "7px 9px",

    borderRadius: 4,

    fontSize: FONT_SIZE_DEFAULT,

    outline: "none",

    color: tokens.textPrimary,

    background: tokens.bgSunken,

    border: `1px solid ${tokens.border}`,

  };

}



/** 列表行按钮样式。 */

function rowButtonStyle(

  tokens: ReturnType<typeof useTheme>["tokens"],

  active: boolean,

): React.CSSProperties {

  return {

    display: "flex",

    flexDirection: "column",

    alignItems: "flex-start",

    gap: 2,

    width: "100%",

    textAlign: "left",

    padding: "8px 10px",

    borderRadius: 4,

    border: `1px solid ${active ? tokens.accent : "transparent"}`,

    background: active ? `${tokens.accent}22` : "transparent",

    color: active ? tokens.textPrimary : tokens.textSecondary,

    cursor: "pointer",

    fontSize: FONT_SIZE_DEFAULT,

  };

}



/** 底部增删按钮样式。 */

function footerBtn(

  tokens: ReturnType<typeof useTheme>["tokens"],

  disabled: boolean,

): React.CSSProperties {

  return {

    flex: 1,

    height: 30,

    borderRadius: 4,

    border: `1px solid ${tokens.border}`,

    background: tokens.bgSunken,

    color: tokens.textPrimary,

    cursor: disabled ? "not-allowed" : "pointer",

    opacity: disabled ? 0.5 : 1,

    fontSize: 12,

  };

}



