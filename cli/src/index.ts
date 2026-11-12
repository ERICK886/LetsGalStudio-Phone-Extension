/**
 * @file index.ts
 * @description create-phone-app CLI 入口（citty）：create / add / pack 子命令与无参向导。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.3.9
 */

import { readFileSync } from "node:fs";
import { defineCommand, runCommand, showUsage } from "citty";

import { runDoctor } from "./commands/doctor.ts";
import { runBuild } from "./commands/build.ts";
import { runAdd } from "./commands/add.ts";
import { runCreate } from "./commands/create.ts";
import { runPack } from "./commands/pack.ts";
import {
  promptAddOptions,
  promptCreateOptions,
  promptWizardMode,
} from "./prompts.ts";

const { version: cliVersion } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

/**
 * 判断当前 argv 是否显式包含已知子命令名。
 *
 * citty 在部分情况下可能同时触发根 `run` 与子命令；无子命令名时才进入向导。
 *
 * @returns 含 create / add / pack 时为 true
 */
function hasKnownSubcommand(): boolean {
  const argv = process.argv.slice(2);

  return argv.some(
    (arg) => ["create", "add", "pack", "doctor", "build"].includes(arg),
  );
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
    description: "创建手机宿主或独立软件工程",
  },
  args: {
    dir: {
      type: "positional",
      required: false,
      description: "目标目录",
    },
    kind: { type: "string", default: "host", description: "工程角色：host | plugin" },
    sdk: { type: "string", description: "SDK 版本或绝对 file: 路径；缺省本仓源码/发布固定版本" },
    template: {
      type: "string",
      default: "default",
      description: "模板：default | minimal",
    },
    extensionId: {
      type: "string",
      description: "宿主扩展包 ID（extension.json.id，可含点号）",
    },
    appId: {
      type: "string",
      description: "首个内页程序 ID（kebab-case）",
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
      kind: args.kind as "host" | "plugin",
      sdk: args.sdk,
      template: args.template as "default" | "minimal",
      extensionId: args.extensionId,
      appId: args.appId,
      title: args.title,
      force: args.force,
    });
  },
});

const addCmd = defineCommand({
  meta: {
    name: "add",
    description: "按 phone-project.json 添加软件并导出控制器",
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
      description: "兼容旧参数；不会覆盖已有软件",
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

const packCmd = defineCommand({
  meta: {
    name: "pack",
    description: "保留真实控制器，构建独立软件包",
  },
  args: {
    sdk: { type: "string", description: "SDK 版本或绝对 file: 路径" },
    prepare: { type: "boolean", default: false, description: "只准备源码，不安装或构建" },
    skipInstall: { type: "boolean", default: false, description: "跳过安装，使用已有依赖构建" },
    appId: {
      type: "positional",
      required: false,
      description: "程序 ID",
    },
    cwd: {
      type: "string",
      description: "起始查找宿主根的目录",
    },
    out: {
      type: "string",
      description: "输出目录，默认 release/<app-id>",

    },
    force: {
      type: "boolean",
      default: false,
      description: "允许更新同一软件的既有 CLI 产物",
    },
    title: {
      type: "string",
      description: "扩展显示标题（默认用 app-id）",
    },
    extensionId: {
      type: "string",
      description: "内页包 extension.json.id（默认等于 app-id）",
    },
  },
  async run({ args }) {
    await runPack({
      sdk: args.sdk,
      prepare: args.prepare,
      skipInstall: args.skipInstall,
      appId: args.appId,
      cwd: args.cwd,
      out: args.out,
      force: args.force,
      title: args.title,
      extensionId: args.extensionId,
    });
  },
});

const doctorCmd = defineCommand({
  meta: { name: "doctor", description: "检查手机工程与发布准备" },
  args: {
    cwd: { type: "string" },
    release: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
  },
  run({ args }) { runDoctor(args); },
});
const buildCmd = defineCommand({
  meta: { name: "build", description: "检查软件结构并构建单入口产物" },
  args: { cwd: { type: "string" } },
  run({ args }) { runBuild(args); },
});

const main = defineCommand({
  meta: {
    name: "create-phone-app",
    version: cliVersion,
    description:
      "Scaffold LetsGal phone host + in-app plugins (create / add / pack)",
  },
  subCommands: {
    create: createCmd,
    add: addCmd,
    pack: packCmd,
    doctor: doctorCmd,
    build: buildCmd,
  },
  async run() {
    // citty quirk：若根 run 与子命令一并触发，仅在无已知子命令时跑向导
    if (hasKnownSubcommand()) {
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
        await showUsage(createCmd);
      } else if (rawArgs.includes("add")) {
        await showUsage(addCmd);
      } else if (rawArgs.includes("pack")) {
        await showUsage(packCmd);
      } else if (rawArgs.includes("doctor")) {
        await showUsage(doctorCmd);
      } else if (rawArgs.includes("build")) {
        await showUsage(buildCmd);
      } else {
        await showUsage(main);
      }

      process.exit(0);
    }

    if (rawArgs.length === 1 && rawArgs[0] === "--version") {
      console.log(cliVersion);
      return;
    }

    await runCommand(main, { rawArgs });
  } catch (err) {
    exitWithExpectedError(err);
  }
}

void start();

