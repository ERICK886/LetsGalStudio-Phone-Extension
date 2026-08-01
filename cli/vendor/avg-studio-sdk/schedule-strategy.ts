/**
 * 扩展提供的项目调度策略。
 *
 * 与 method() 不同，调度策略不会出现在“调用扩展方法”块里，只能被项目级
 * 根调度节点选择。resolve 可以等待扩展 UI 的用户输入；Promise resolve 后再
 * 返回章节决策，因此地图选择不需要把长任务或 Promise 写入存档。
 */

import type { ExtensionContext } from "./sdk-context";
import type { ExtensionBase } from "./extension-base";
import type { BlockSchema } from "./types/block-schema";

const SCHEDULE_STRATEGY_BRAND = Symbol.for("avg.schedule-strategy");

export interface ScheduleChapterMeta {
  id: string;
  name: string;
  index: number;
}

export interface ScheduleStrategyInput {
  schedulerId: string;
  /** 只包含调度节点下方、未禁用的候选章节。 */
  chapters: readonly ScheduleChapterMeta[];
  activeChapterId: string | null;
  lastCompletedChapterId: string | null;
  cycle: number;
  /**
   * 仅由 Studio 调试模式注入的临时条件覆盖。正式预览、构建和玩家运行时为
   * undefined。策略可以用它构造项目自己的日期、角色或事件测试状态，但不得
   * 把这里的值当成正式配置来源。
   */
  debugConditions?: Readonly<Record<string, unknown>>;
}

export type ScheduleStrategyDecision =
  | {
      kind: "chapter";
      chapterId: string;
      /** 可选调试信息；Studio 只展示，不解释业务结构。 */
      diagnostics?: unknown;
    }
  | { kind: "end"; reason?: string; diagnostics?: unknown };

export interface ScheduleStrategyDebugConfig {
  /** 调试条件表单上方的项目侧说明。 */
  description?: string;
  /**
   * Studio 按扩展方法参数同款 schema 生成调试表单。未声明时仍允许作者通过
   * JSON 输入任意条件；这里只描述常用字段，不参与正式游戏构建。
   */
  schema?: BlockSchema;
}

export interface ScheduleEventSummaryItem {
  label: string;
  value: string;
}

export interface ScheduleStrategyEventEditorConfig {
  /** 事件配置卡上方的项目侧说明。 */
  description?: string;
  /** Studio 用来编辑 Fragment.metadata.scheduleEvent.config 的字段声明。 */
  schema?: BlockSchema;
  /** 可选的折叠态摘要；必须是无副作用的纯函数。 */
  summarize?(
    config: Readonly<Record<string, unknown>>,
  ): readonly ScheduleEventSummaryItem[];
  /**
   * 把事件条件转换成一组“可满足该条件”的 Studio 临时调试状态。返回值仍会
   * 交给正式 Scheduler 筛选，不能通过这里强制指定 Event。
   */
  createDebugConditions?(
    config: Readonly<Record<string, unknown>>,
    ref: { chapterId: string; fragmentId: string },
  ): Record<string, unknown>;
}

export interface ScheduleStrategyDef {
  title: string;
  description?: string;
  /** 可选的 Studio 调试条件声明。 */
  debug?: ScheduleStrategyDebugConfig;
  /** 可选的 Fragment 调度事件编辑声明。 */
  event?: ScheduleStrategyEventEditorConfig;
  /** 可选稳定 id；缺省由静态属性名转 kebab-case。 */
  id?: string;
  resolve(
    this: ExtensionBase,
    ctx: ExtensionContext,
    input: ScheduleStrategyInput,
  ):
    | ScheduleStrategyDecision
    | Promise<ScheduleStrategyDecision>;
}

export type BrandedScheduleStrategy = ScheduleStrategyDef & {
  readonly [SCHEDULE_STRATEGY_BRAND]: true;
};

export function scheduleStrategy(
  def: ScheduleStrategyDef,
): BrandedScheduleStrategy {
  return Object.assign(def, { [SCHEDULE_STRATEGY_BRAND]: true as const });
}

export function isScheduleStrategy(
  value: unknown,
): value is BrandedScheduleStrategy {
  return (
    !!value &&
    typeof value === "object" &&
    SCHEDULE_STRATEGY_BRAND in value
  );
}

export interface ListedScheduleStrategy {
  localId: string;
  propertyName: string;
  def: BrandedScheduleStrategy;
}

export function listScheduleStrategies(
  cls: unknown,
): ListedScheduleStrategy[] {
  if (typeof cls !== "function") return [];
  const out: ListedScheduleStrategy[] = [];
  const seen = new Set<string>();
  for (const [propertyName, value] of Object.entries(cls)) {
    if (!isScheduleStrategy(value)) continue;
    const localId =
      value.id ??
      propertyName.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    if (!/^[a-z0-9-]+$/.test(localId)) {
      throw new Error(
        `[listScheduleStrategies] 策略 id 必须只包含 a-z、0-9、-: ${localId}`,
      );
    }
    if (seen.has(localId)) {
      throw new Error(
        `[listScheduleStrategies] 类 "${(cls as { name?: string }).name}" 中策略 id 重复: ${localId}`,
      );
    }
    seen.add(localId);
    out.push({ localId, propertyName, def: value });
  }
  return out;
}
