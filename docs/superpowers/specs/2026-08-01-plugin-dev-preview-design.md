# 手机内页应用（src/plugin）设计

> **日期**：2026-08-01  
> **状态**：已实现；**修订**：目录迁入 `src/plugin/`，取消 `src/plugin-dev/`  
> **范围**：本仓库内多应用开发、预览与随主扩展打包  
> **相关**：`docs/superpowers/specs/2026-08-01-phone-in-app-sdk-design.md`、`phone-sdk/README.md`

## 1. 目标

1. 在 `src/plugin/<app-id>/` 下并行开发多个内页应用；
2. `pnpm watch` 预览，`pnpm build` 打包进主扩展；
3. 作者手动配置「动作 · 手机内部应用」后点开；
4. 可选迁出为独立 Studio 扩展。

## 2. 架构

```text
src/index.tsx
  └─ 静态 import src/plugin/bootstrap.ts
       ├─ 挂接 slot.pluginDevReregister
       └─ registerAllPluginDevApps()
            └─ registerPhoneApp(...)
PhoneExtension.onRegister
  └─ installHost → pluginDevReregister()
```

## 3. 目录

```text
src/plugin/
├── bootstrap.ts
├── dev-registry.ts
└── <app-id>/
```

已取消：`src/plugin-dev/`、仓库根目录 `plugin/`。
