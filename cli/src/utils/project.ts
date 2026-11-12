import { assertModuleExports } from "./module-exports.ts";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { assertValidAppId } from "./validate.ts";

export interface PhoneProject {
  schemaVersion: 1;
  kind: "host" | "plugin";
  appsDir: string;
  registry: string;
}

export interface PhoneAppManifest {
  schemaVersion: 1;
  id: string;
  registration: { entry: string; export: string };
  controller: { entry: string; exports: string[] };
}

/** 配置路径限于工程内部，同时检查已存在的符号链接。 */
export function projectPath(root: string, value: string): string {
  if (!value || isAbsolute(value)) throw new Error(`路径必须为工程内相对路径：${value}`);
  const target = resolve(root, value);
  const check = (base: string, file: string) => {
    const rel = relative(base, file);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`路径越出工程：${value}`);
  };
  check(resolve(root), target);
  let ancestor = target;
  while (!existsSync(ancestor) && dirname(ancestor) !== ancestor) ancestor = dirname(ancestor);
  if (existsSync(ancestor)) check(realpathSync(root), resolve(realpathSync(ancestor), relative(ancestor, target)));
  return target;
}

export function readPhoneProject(root: string): PhoneProject {
  const path = resolve(root, "phone-project.json");
  if (!existsSync(path)) return { schemaVersion: 1, kind: "host", appsDir: "src", registry: "src/index.tsx" };
  const raw = JSON.parse(readFileSync(path, "utf8")) as PhoneProject;
  if (raw.schemaVersion !== 1 || !["host", "plugin"].includes(raw.kind) ||
      typeof raw.appsDir !== "string" || typeof raw.registry !== "string") {
    throw new Error("phone-project.json 格式错误或版本不支持");
  }
  projectPath(root, raw.appsDir);
  projectPath(root, raw.registry);
  return raw;
}

/** 打包使用声明的真实控制器，拒绝猜测并生成可能丢失设置的替代类。 */
export function readPhoneAppManifest(appDir: string, appId: string): PhoneAppManifest {
  const path = resolve(appDir, "phone-app.json");
  if (!existsSync(path)) throw new Error(`缺少 ${path}；请声明 registration 和 controller 后再打包，避免丢失设置/存档`);
  const raw = JSON.parse(readFileSync(path, "utf8")) as PhoneAppManifest;
  assertValidAppId(appId);
  if (raw.schemaVersion !== 1 || raw.id !== appId || !raw.registration || !raw.controller ||
      !/^[A-Za-z_$][\w$]*$/.test(raw.registration.export ?? "") ||
      !Array.isArray(raw.controller.exports) || !raw.controller.exports.length ||
      raw.controller.exports.some((name) => typeof name !== "string" || !/^[A-Za-z_$][\w$]*$/.test(name))) {
    throw new Error(`phone-app.json 格式错误或 id 不一致：${appId}`);
  }
  for (const entry of [raw.registration.entry, raw.controller.entry]) {
    if (typeof entry !== "string" || !/\.[cm]?[jt]sx?$/.test(entry) || !existsSync(projectPath(appDir, entry))) {
      throw new Error(`应用入口不存在或格式错误：${entry}`);
    }
  }
  assertModuleExports(projectPath(appDir, raw.registration.entry), [raw.registration.export]);
  assertModuleExports(projectPath(appDir, raw.controller.entry), raw.controller.exports);
  return raw;
}
