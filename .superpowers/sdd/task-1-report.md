# Task 1 报告（REDO）

**日期：** 2026-08-01  
**分支：** `feat/create-phone-app-host-pack`  
**工作目录：** `C:\Users\20231\Documents\AVG-Extensions\ext-7a9373`

## 状态

✅ **完成** — create-host 模板已创建，create 已切换，旧双模式模板已删除，全量 CLI 测试通过。

## 变更摘要

| 操作 | 路径 |
|------|------|
| 修改 | `cli/src/commands/create-template-files.test.ts` — 断言 `create-host-*` + 保留 `pack-release` |
| 修改 | `cli/src/commands/create.ts` — 宿主模板 + add 内页 + `copyBundledAvgStudioSdk` + 新成功文案 |
| 新建 | `cli/templates/create-host-default/**`（8 个关键文件） |
| 新建 | `cli/templates/create-host-minimal/**`（8 个关键文件，短 README） |
| 删除 | `cli/templates/create-default/**` |
| 删除 | `cli/templates/create-minimal/**` |
| 保留 | `cli/templates/pack-release/**`、`cli/src/commands/pack.ts`、`pack.test.ts`（Task 2） |

## create 流程

1. `templateName` → `create-host-default` | `create-host-minimal`
2. `copyTemplateDir(hostTemplate, dest, vars)`
3. `copyTemplateDir(add, join(dest, "src", appId), vars)`
4. `copyBundledAvgStudioSdk(dest)`

## 测试

```powershell
cd cli ; node --import tsx --test src/**/*.test.ts
```

| 指标 | 结果 |
|------|------|
| 套件 | 15 |
| 用例 | 32 |
| 通过 | 32 |
| 失败 | 0 |

## 未做（按 brief）

- 未 commit
- 未接线 `pack` 到 `index.ts`（Task 3）
- 未改 `cli/README.md` / `cli/package.json` version（Task 3）

## 关注点

- 宿主 `src/index.tsx` 静态 import `./{{appId}}`；内页由 add 模板在 create 时写入，与 `runAdd` 策略一致。
- `peerDependencies` 含 `"@avg-studio/sdk": "*"`，与 brief 及旧 create 模板一致。
- Task 4 冒烟（create + build、本仓 pack demo-shop）尚未执行。
