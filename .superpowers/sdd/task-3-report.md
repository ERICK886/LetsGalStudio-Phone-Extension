# Task 3 报告：接线 CLI（index / prompts / README / 0.3.0）

**日期：** 2026-08-01  
**状态：** ✅ 完成  
**分支：** feat/create-phone-app-host-pack  
**未提交**（按 brief 要求）

---

## 完成项

| 文件 | 变更 |
|------|------|
| `cli/src/index.ts` | 注册 `pack` 子命令；`hasKnownSubcommand` 含 pack；help 分支；version/description 更新为 0.3.0 |
| `cli/src/prompts.ts` | 新增 `promptPackAppId(hostRoot)`：扫描 `src/*/index.tsx` 目录，单候选直返，多候选 `select` |
| `cli/src/commands/pack.ts` | 缺省 app-id 时：TTY → `promptPackAppId`；非 TTY → 抛出「请指定 app-id」 |
| `cli/package.json` | `"version": "0.3.0"`；description 含 pack |
| `cli/README.md` | 重写 create（宿主）/ pack / add 文档；删除 0.2.0 双模式说明 |
| `cli/src/commands/pack.test.ts` | 用例重命名为「非交互且未指定 app-id 时抛出」（行为不变） |

## 验证

```powershell
cd cli ; node --import tsx --test src/**/*.test.ts
# 32 pass / 0 fail

node ../cli/bin/create-phone-app.js --version
# 0.3.0

node ../cli/bin/create-phone-app.js pack --help
# 显示 pack 子命令用法 v0.3.0
```

## 设计决策

- **向导未加 pack 选项**（YAGNI）：无参向导仍为 create / add；pack 通过子命令或缺省 app-id 时 TTY 交互选择。
- **非交互 pack 必须显式传 app-id**：CI/管道友好，与 brief 推荐一致。

## 遗留 / 后续（Task 4+）

- 本仓 `pnpm create-phone-app pack demo-shop --force` 冒烟（Task 4）
- npm publish 0.3.0（Task 5，用户要求时）
- `cli/bin/create-phone-app.js` 文件头 version 仍为 0.1.0（非 brief 范围，可选同步）

## 风险

- `runPack` 完整流程（install/build）仍无集成测；Task 2 已有路径校验测，Task 4 冒烟覆盖端到端。
