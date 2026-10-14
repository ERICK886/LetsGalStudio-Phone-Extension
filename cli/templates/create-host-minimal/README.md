# {{title}}

LetsGal 手机**宿主**扩展（minimal）。`sdk/` = `@avg-studio/sdk`；phone-sdk = `{{phoneSdkVersion}}`；内页 `src/{{appId}}/`。`vite.config.ts` 已配置 define `__PHONE_HOST_EXTENSION_ID__`。

入口导出 PhoneExtension、PhoneHudExtension、ToastExtension、PhoneEditorExtension；minimal 精简目录内容，仍保留宿主、HUD、通知和作者编辑器模块。

**开发：** `pnpm install` → `pnpm watch` → Studio 仅启用本扩展  
**分发内页：** `pnpm create-phone-app pack {{appId}}` → 产物 `./release/`
