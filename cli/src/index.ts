/**
 * @file index.ts
 * @description create-phone-app CLI 入口（citty）：create / add 子命令与无参向导。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { defineCommand, runCommand, showUsage } from "citty";

import { runAdd } from "./commands/add.ts";
import { runCreate } from "./commands/create.ts";
import {
  promptAddOptions,
  promptCreateOptions,
  promptWizardMode,
} from "./prompts.ts";

/**
 * 判断当前 argv 是否显式包含 create / add 子命令名。
 *
 * citty 在部分情况下可能同时触发根 `run` 与子命令；无子命令名时才进入向导。
 *
 * @returns 含 create 或 add 时为 true
 */
function hasCreateOrAddSubcommand(): boolean {
  const argv = process.argv.slice(2);

  return argv.some((arg) => arg === "create" || arg === "add");
}

/**
 * 可预期错误：仅打印用户可读消息并非零退出（设计 §9，不打印堆栈）。
 *
 * @param err - catch 到的未知值
 * @returns never（始终 process.exit）
 */
function exitWithExpectedError(err: unknown): never {
  if (err instanceof Error) {
    console.error(err.message);
    process.exit(1);
  }

  console.error(String(err));
  process.exit(1);
}

const createCmd = defineCommand({
  meta: {
    name: "create",
    description: "创建独立内页扩展工程",
  },
  args: {
    dir: {
      type: "positional",
      required: false,
      description: "目标目录",
    },
    template: {
      type: "string",
      default: "default",
      description: "模板：default | minimal",
    },
    appId: {
      type: "string",
      description: "程序 ID（kebab-case）",
    },
    title: {
      type: "string",
      description: "显示标题",
    },
    force: {
      type: "boolean",
      default: false,
      description: "允许写入非空目标目录",
    },
  },
  async run({ args }) {
    await runCreate({
      dir: args.dir,
      template: args.template as "default" | "minimal",
      appId: args.appId,
      title: args.title,
      force: args.force,
    });
  },
});

const addCmd = defineCommand({
  meta: {
    name: "add",
    description: "在本仓库 src/<app-id>/ 添加内页应用",
  },
  args: {
    appId: {
      type: "positional",
      required: false,
      description: "程序 ID（kebab-case）",
    },
    title: {
      type: "string",
      description: "显示标题",
    },
    cwd: {
      type: "string",
      description: "起始查找宿主根的目录（默认 process.cwd()）",
    },
    force: {
      type: "boolean",
      default: false,
      description: "允许覆盖已存在的 src/<app-id>/",
    },
  },
  async run({ args }) {
    await runAdd({
      appId: args.appId,
      title: args.title,
      cwd: args.cwd,
      force: args.force,
    });
  },
});

const main = defineCommand({
  meta: {
    name: "create-phone-app",
    version: "0.1.0",
    description: "Scaffold LetsGal phone in-app plugins (create / add)",
  },
  subCommands: {
    create: createCmd,
    add: addCmd,
  },
  async run() {
    // citty quirk：若根 run 与子命令一并触发，仅在无 create/add 时跑向导
    if (hasCreateOrAddSubcommand()) {
      return;
    }

    const mode = await promptWizardMode();

    if (mode === "create") {
      const opts = await promptCreateOptions({});
      await runCreate(opts);
    } else {
      const opts = await promptAddOptions({});
      await runAdd(opts);
    }
  },
});

/**
 * 启动 CLI（不用 citty `runMain`：其对普通 Error 会经 consola 打印完整堆栈）。
 *
 * - `--help` / `-h`：打印用法后 exit 0
 * - `--version`：打印版本后返回
 * - 业务 / 校验抛出的 `Error`：仅 `console.error(message)` + exit 1
 *
 * @returns Promise<void>
 */
async function start(): Promise<void> {
  const rawArgs = process.argv.slice(2);

  try {
    if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
      if (rawArgs.includes("create")) {
        await showUsage(createCmd, main);
      } else if (rawArgs.includes("add")) {
        await showUsage(addCmd, main);
      } else {
        await showUsage(main);
      }

      process.exit(0);
    }

    if (rawArgs.length === 1 && rawArgs[0] === "--version") {
      const meta =
        typeof main.meta === "function" ? await main.meta() : main.meta;

      console.log(meta?.version ?? "0.1.0");
      return;
    }

    await runCommand(main, { rawArgs });
  } catch (err) {
    exitWithExpectedError(err);
  }
}

void start();

