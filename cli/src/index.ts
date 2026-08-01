/**
 * @file index.ts
 * @description create-phone-app CLI 入口（citty）。
 * @author 池水三两升
 * @date 2026-08-01
 * @version 0.1.0
 */

import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "create-phone-app",
    version: "0.1.0",
    description: "Scaffold LetsGal phone in-app plugins (create / add)",
  },
  subCommands: {},
  async run() {
    console.log("create-phone-app 0.1.0 — 子命令将在后续任务接入");
  },
});

runMain(main);
