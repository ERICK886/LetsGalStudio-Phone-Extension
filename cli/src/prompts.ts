/**
 * @file prompts.ts
 * @description create-phone-app 交互向导问题封装（@clack/prompts）。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import * as p from "@clack/prompts";

import { APP_ID_RE, assertValidAppId } from "./utils/validate.ts";

/** create 向导可选项（均可缺省，缺省时再提问） */
export type CreateOptionsPartial = {
  dir?: string;
  template?: "default" | "minimal";
  appId?: string;
  title?: string;
  force?: boolean;
};

/** create 向导完整结果 */
export type CreateOptions = {
  dir: string;
  template: "default" | "minimal";
  appId: string;
  title: string;
  force: boolean;
};

/** add 向导可选项 */
export type AddOptionsPartial = {
  appId?: string;
  title?: string;
  force?: boolean;
};

/** add 向导完整结果 */
export type AddOptions = {
  appId: string;
  title: string;
  force: boolean;
};

/**
 * 若用户取消（Ctrl+C / Esc），以退出码 0 结束进程。
 *
 * @param value - @clack/prompts 返回值
 * @returns 非取消时的原值
 *
 * @example
 * ```ts
 * const name = handleCancel(await p.text({ message: "名称" }));
 * ```
 */
function handleCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("已取消");
    process.exit(0);
  }

  return value;
}

/**
 * 校验 app-id 输入；合法返回 undefined，非法返回中文错误文案。
 *
 * @param value - 用户输入
 * @returns 错误消息或 undefined
 */
function validateAppIdInput(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return "app-id 不能为空";
  }

  if (!APP_ID_RE.test(trimmed)) {
    return "须匹配 ^[a-z][a-z0-9-]*$（小写字母开头，仅小写字母/数字/连字符）";
  }

  return undefined;
}

/**
 * 无子命令时询问运行模式：create 或 add。
 *
 * @returns `"create"` | `"add"`
 * @throws 不抛出；用户取消时 `process.exit(0)`
 *
 * @example
 * ```ts
 * const mode = await promptWizardMode();
 * ```
 */
export async function promptWizardMode(): Promise<"create" | "add"> {
  const mode = handleCancel(
    await p.select({
      message: "请选择要执行的操作",
      options: [
        {
          value: "create" as const,
          label: "create",
          hint: "创建独立内页扩展工程",
        },
        {
          value: "add" as const,
          label: "add",
          hint: "在本仓库 src/<app-id>/ 添加内页应用",
        },
      ],
    }),
  );

  return mode;
}

/**
 * 补全 create 所需选项；已提供字段跳过提问。
 *
 * @param partial - 命令行已传入的部分选项
 * @returns 完整 create 选项
 * @throws 不抛出；用户取消时 `process.exit(0)`
 *
 * @example
 * ```ts
 * const opts = await promptCreateOptions({ template: "minimal" });
 * ```
 */
export async function promptCreateOptions(
  partial: CreateOptionsPartial,
): Promise<CreateOptions> {
  p.intro("创建独立内页扩展工程");

  let appId = partial.appId?.trim();

  if (appId) {
    assertValidAppId(appId);
  } else {
    appId = handleCancel(
      await p.text({
        message: "程序 ID（app-id）",
        placeholder: "demo-shop",
        validate: validateAppIdInput,
      }),
    ).trim();
  }

  let title = partial.title?.trim();

  if (!title) {
    title = handleCancel(
      await p.text({
        message: "显示标题",
        placeholder: appId,
        defaultValue: appId,
      }),
    ).trim();
  }

  let template = partial.template;

  if (template !== "default" && template !== "minimal") {
    template = handleCancel(
      await p.select({
        message: "选择模板",
        options: [
          {
            value: "default" as const,
            label: "default",
            hint: "完整独立扩展（含详细 README）",
          },
          {
            value: "minimal" as const,
            label: "minimal",
            hint: "最小独立扩展",
          },
        ],
        initialValue: "default",
      }),
    );
  }

  let dir = partial.dir?.trim();

  if (!dir) {
    const defaultDir = `./${appId}`;

    dir = handleCancel(
      await p.text({
        message: "目标目录",
        placeholder: defaultDir,
        defaultValue: defaultDir,
      }),
    ).trim();
  }

  const force = partial.force ?? false;

  return { dir, template, appId, title, force };
}

/**
 * 补全 add 所需选项；已提供字段跳过提问。
 *
 * @param partial - 命令行已传入的部分选项
 * @returns 完整 add 选项
 * @throws 不抛出；用户取消时 `process.exit(0)`
 *
 * @example
 * ```ts
 * const opts = await promptAddOptions({ appId: "notes" });
 * ```
 */
export async function promptAddOptions(
  partial: AddOptionsPartial,
): Promise<AddOptions> {
  p.intro("在本仓库添加内页应用");

  let appId = partial.appId?.trim();

  if (appId) {
    assertValidAppId(appId);
  } else {
    appId = handleCancel(
      await p.text({
        message: "程序 ID（app-id）",
        placeholder: "notes",
        validate: validateAppIdInput,
      }),
    ).trim();
  }

  let title = partial.title?.trim();

  if (!title) {
    title = handleCancel(
      await p.text({
        message: "显示标题",
        placeholder: appId,
        defaultValue: appId,
      }),
    ).trim();
  }

  const force = partial.force ?? false;

  return { appId, title, force };
}
