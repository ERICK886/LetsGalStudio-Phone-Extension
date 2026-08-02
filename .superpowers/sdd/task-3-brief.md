# Task 3: 接线 CLI（index / prompts / README / 0.3.0）

**Workdir:** `C:\Users\20231\Documents\AVG-Extensions\ext-7a9373`
**Branch:** `feat/create-phone-app-host-pack`

## Files
- Modify: `cli/src/index.ts` — register pack subcommand; help; version 0.3.0; hasKnownSubcommand includes pack
- Modify: `cli/src/prompts.ts` — add `promptPackAppId(hostRoot)` listing src/*/index.tsx dirs
- Modify: `cli/package.json` — `"version": "0.3.0"`
- Modify: `cli/README.md` — host create + pack docs; remove dual-mode / old create-default docs
- Optionally: wire runPack to call promptPackAppId when appId missing (instead of throw) — update pack.ts accordingly

## pack CLI args (from plan)
```
appId positional optional
--cwd, --out default release, --force, --title
```

## Wizard (YAGNI ok)
Subcommand is required. Optional: add pack to wizard — prefer at least subcommand + help.

## When appId missing in runPack
Prefer: if no appId, call `promptPackAppId(hostRoot)` from prompts (Task 3). Update pack.test that expected throw for missing appId — either keep throw when non-interactive (no TTY) or change test to only cover invalid paths. Simplest: keep throw `请指定 app-id` when `process.stdout.isTTY === false` or when `opts.appId` empty AND skip prompt in tests; with TTY use prompt. Even simpler for Task 3: in `runPack`, if !appId then `appId = await promptPackAppId(hostRoot)`; update pack.test "未指定 app-id" to pass a stub or remove that case and test prompt separately. **Recommended:** `runPack` calls prompt when appId missing; change pack.test to not cover empty appId (or mock). Keep host-missing and app-dir-missing tests.

## Do NOT commit
## Report: `.superpowers/sdd/task-3-report.md`
