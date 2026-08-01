# Phone SDK：宿主 main 与 plugin 入口拆分

> **日期**：2026-08-01  
> **状态**：已实施  
> **范围**：将宿主（phone / toast / studio）迁入 `@ink-zenly/phone-sdk` main；内页客户端 API 走 `/plugin`；内页应用仍在 `src/plugin/` 开发

## 1. 目标

1. 宿主手机开发与内页 plugin 开发目录分离。
2. `@ink-zenly/phone-sdk`（main）= 宿主：`PhoneExtension` / `ToastExtension` / studio 副作用；**不编写内页应用**。
3. `@ink-zenly/phone-sdk/plugin` = 薄客户端：`registerPhoneApp` 等。
4. `src/index.tsx` 统一 re-export 宿主，并单独引导 / 导出 `src/plugin` 清单。
5. 内页应用继续写在 `src/plugin/<app-id>/`（扩展入口侧，不属于宿主包）。

## 2. 目录

```text
phone-sdk/
├── package.json          # exports "." + "./plugin"
└── src/
    ├── index.ts          # 宿主入口
    ├── plugin/           # 薄客户端 + diag
    ├── phone/
    ├── toast/
    └── studio/

src/
├── index.tsx             # 扩展入口：re-export 宿主 + plugin bootstrap
└── plugin/               # 内页应用（只依赖 /plugin）
```

## 3. 约定

- `src/plugin/**` 仅可依赖 `@ink-zenly/phone-sdk/plugin` 与 `react`。
- 宿主内部引用客户端 API 时用 `@ink-zenly/phone-sdk/plugin`，避免 main 自引用环。
- Vite 仍以 `src/index.tsx` 为入口，且不 external `@ink-zenly/phone-sdk`。

## 4. 非目标

- 不发正式 npm 包、不做独立 phone-sdk 构建流水线。
- 不改变 Studio 扩展对外程序 ID / UI ID。
