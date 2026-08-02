# Task 1 (REDO): create-host 模板 + 切换 create

**Workdir:** `C:\Users\20231\Documents\AVG-Extensions\ext-7a9373`
**Branch:** `feat/create-phone-app-host-pack`
**Note:** Previous worktree was corrupted; redo Task 1 here. **KEEP** existing `cli/templates/pack-release/**` and `cli/src/commands/pack.ts` / `pack.test.ts` (Task 2 already present).

## Must do
1. Update `create-template-files.test.ts`:
   - Assert `create-host-default` + `create-host-minimal` with HOST_REQUIRED:
     `.gitignore`, `extension.json`, `package.json`, `README.md`, `tsconfig.json`, `vite.config.ts`, `src/index.tsx`, `src/vite-env.d.ts`
   - Keep/assert `pack-release` PACK_RELEASE_REQUIRED (already in file)
   - Remove dual-mode create-default/minimal assertions
2. Create `cli/templates/create-host-default/**` and `create-host-minimal/**` per plan
3. Change `runCreate` to:
   - template `create-host-*`
   - copy host → copy `add` to `src/<appId>/` → `copyBundledAvgStudioSdk`
   - success text: 开发宿主 + pack 提示
4. **Delete** `cli/templates/create-default/**` and `create-minimal/**` entirely
5. Run all CLI tests PASS

## package.json deps shape
```json
"dependencies": {
  "@avg-studio/sdk": "file:./sdk",
  "@ink-zenly/phone-sdk": "{{phoneSdkVersion}}"
},
"peerDependencies": {
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "@avg-studio/sdk": "*"
}
```
`.gitignore` includes `release`. Host `src/index.tsx` exports Phone/Toast + bootstrap `{{registerFnName}}` from `./{{appId}}`.

## Do NOT
- Do not delete pack-release or pack.ts
- Do not wire pack into index.ts (Task 3)
- Do not commit

## Report
`.superpowers/sdd/task-1-report.md`
