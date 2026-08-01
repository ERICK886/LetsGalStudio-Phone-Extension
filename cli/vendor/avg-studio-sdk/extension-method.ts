/**
 * 统一模块基类(Extension)的方法声明:method() 品牌工厂。
 *
 * 设计:docs/plans/2026-06-10-unified-extension-base-class-design.md §3.3
 *
 * 一个方法 = 一个静态 property(不再一类一方法):
 *
 * ```ts
 * class InventorySystem extends Extension {
 *   static addItem = method({
 *     title: "增加物品",
 *     schema: {
 *       itemId: { type: "string", label: "物品 ID", required: true },
 *       count:  { type: "number", label: "数量", default: 1 },
 *     },
 *     async run(ctx, params) {
 *       // params: { itemId: string; count: number } —— 从 schema 推导
 *       const items = this.save.get("items");
 *       ...
 *     },
 *   });
 * }
 * ```
 *
 * 方法 id 缺省由属性名推导(addItem → "add-item"),全局引用
 * "extId/add-item" —— 与 BlockExtension.globalType 同格式,Action block
 * 的「调用方法」链路零改动。重命名属性 = 老剧本断链,发布后建议
 * 显式锁定 `id` 字段。
 */

import type { ExtensionContext } from "./sdk-context";
import type { BlockSchema } from "./types/block-schema";
import type { ExtensionBase } from "./extension-base";

const METHOD_BRAND = Symbol.for("avg.extension-method");

/**
 * schema → params 的类型推导:作者在 run 里拿到强类型参数。
 * string/asset/character/scene/fragment/variable 等 id 类参数统一 string。
 */
export type ParamsOf<S extends BlockSchema | undefined> = S extends BlockSchema
  ? {
      [K in keyof S]: S[K] extends { type: "number" }
        ? number
        : S[K] extends { type: "boolean" }
          ? boolean
          : S[K] extends {
                type: "enum";
                options: ReadonlyArray<{ value: infer V }>;
              }
            ? V
            : string;
    }
  : Record<string, never>;

export interface ExtensionMethodDef<
  S extends BlockSchema | undefined = BlockSchema | undefined,
> {
  /** 方法 picker 里显示的名字。 */
  title: string;
  description?: string;
  /**
   * 可选:显式方法 id(kebab-case)。缺省 kebabize(属性名)。
   * 发布后建议显式锁定 —— 属性重命名会让引用它的剧本断链。
   */
  id?: string;
  /** 参数定义 —— Studio 自动生成参数表单(每个参数带"值/变量"切换)。 */
  schema?: S;
  /**
   * 执行体。this = 模块实例(可用 this.save / this.context),
   * params 已是最终值 —— 创作者填的变量引用,引擎在调用前已解好。
   */
  run(
    this: ExtensionBase,
    ctx: ExtensionContext,
    params: ParamsOf<S>,
  ): void | Promise<void>;
  /** 可选:立即生效版本(不等动画)。 */
  runImmediately?(
    this: ExtensionBase,
    ctx: ExtensionContext,
    params: ParamsOf<S>,
  ): void | Promise<void>;
  /** 可选:玩家快进时的简化行为。缺省 fallback 到 run。 */
  skip?(
    this: ExtensionBase,
    ctx: ExtensionContext,
    params: ParamsOf<S>,
  ): void | Promise<void>;
}

export type BrandedExtensionMethod<
  S extends BlockSchema | undefined = BlockSchema | undefined,
> = ExtensionMethodDef<S> & { readonly [METHOD_BRAND]: true };

/** 把一个方法定义打上品牌,作为静态 property 挂到 Extension 子类上。 */
export function method<const S extends BlockSchema | undefined = undefined>(
  def: ExtensionMethodDef<S>,
): BrandedExtensionMethod<S> {
  return Object.assign(def, { [METHOD_BRAND]: true as const });
}

export function isExtensionMethod(
  v: unknown,
): v is BrandedExtensionMethod<BlockSchema | undefined> {
  return !!v && typeof v === "object" && METHOD_BRAND in v;
}

/** camelCase / PascalCase → kebab-case,与 uiId 推导同款规则。 */
export function kebabizeMethodName(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export interface ListedExtensionMethod {
  /** 方法局部 id(def.id 或属性名 kebabize)。 */
  localId: string;
  /** 静态属性名(调试/报错用)。 */
  propertyName: string;
  def: BrandedExtensionMethod<BlockSchema | undefined>;
}

/**
 * 列出一个 Extension 子类上声明的全部方法(扫静态 own property 认品牌)。
 * 纯函数,SDK / loader / Studio hook 共用,保证三处看到同一份方法表。
 */
export function listExtensionMethods(cls: unknown): ListedExtensionMethod[] {
  if (typeof cls !== "function") return [];
  const out: ListedExtensionMethod[] = [];
  const seen = new Set<string>();
  // 只扫 own static(不上原型链):方法属于声明它的类,避免继承带来的重复登记。
  for (const [key, value] of Object.entries(cls)) {
    if (!isExtensionMethod(value)) continue;
    const localId = value.id ?? kebabizeMethodName(key);
    if (seen.has(localId)) {
      throw new Error(
        `[listExtensionMethods] 类 "${(cls as { name?: string }).name}" 中方法 id 重复: ${localId}`,
      );
    }
    seen.add(localId);
    out.push({ localId, propertyName: key, def: value });
  }
  return out;
}
