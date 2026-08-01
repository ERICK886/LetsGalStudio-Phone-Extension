/**
 * string 参数的编辑期候选值声明。
 *
 * Studio 会把「同一扩展内声明了相同 key 的所有参数」在当前项目剧本里
 * 已填过的值汇成一个候选池，渲染成可输入 + 可下拉选择的控件 —— 作者
 * 第一次在某处填过"小美"，其它指令的同类参数就能直接下拉选到，不用
 * 手敲、也不会敲错。声明处即收集处：写这个 key 的地方既是数据源也是
 * 下拉消费者。
 *
 * 运行时行为不受影响：值仍是普通字符串，扩展照常收到作者填的文本。
 */
export interface BlockFieldSuggestions {
  /** 候选池分组名（扩展内唯一即可，如 "contact"、"track"）。 */
  key: string;
  /**
   * 额外把角色库的所有角色名并入候选。适合"这个参数通常就是某个角色"
   * 的场景（手机联系人、称呼等）：项目里还没有任何历史值时，下拉里
   * 直接就有全部角色可选。
   */
  includeCharacterNames?: boolean;
}

export type BlockSchemaField =
  | {
      type: "string";
      label?: string;
      default?: string;
      multiline?: boolean;
      required?: boolean;
      /** 编辑期候选值下拉（见 BlockFieldSuggestions）。多行文本不建议声明。 */
      suggestions?: BlockFieldSuggestions;
    }
  | {
      type: "number";
      label?: string;
      default?: number;
      min?: number;
      max?: number;
      step?: number;
      required?: boolean;
    }
  | {
      type: "boolean";
      label?: string;
      default?: boolean;
      required?: boolean;
    }
  | {
      type: "enum";
      label?: string;
      default?: string;
      options: Array<{ label: string; value: string }>;
      required?: boolean;
    }
  | {
      type: "asset";
      label?: string;
      assetType?: "image" | "audio" | "video" | "any";
      required?: boolean;
    }
  | { type: "character"; label?: string; required?: boolean }
  | {
      type: "characterPortrait";
      label?: string;
      /**
       * 可选：关联同 schema 的 character 字段。Studio 会按该字段当前选择
       * 的角色筛选立绘；未关联时列出工程内所有去重后的立绘 id。
       */
      characterField?: string;
      required?: boolean;
    }
  | { type: "scene"; label?: string; required?: boolean }
  | {
      type: "fragment";
      label?: string;
      required?: boolean;
      /**
       * 可选：选择片段时，把其所属章节 id 同步写入同 schema 的另一个字段。
       * 片段值本身仍只保存稳定的 fragment id。
       */
      chapterField?: string;
    }
  | {
      type: "variable";
      label?: string;
      required?: boolean;
      /**
       * 可选：选择变量时，把面向创作者的显示名同步写入同 schema 的另一个
       * string 字段。扩展运行时既能拿稳定 key，也能拿“好感度”这类友好名称。
       */
      displayNameField?: string;
    }
  | { type: "uiExtension"; label?: string; required?: boolean };

export type BlockSchema = Record<string, BlockSchemaField>;

export type BlockParams = Record<string, unknown>;
