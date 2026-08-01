/**
 * 仅描述素材解析所需的 SDK 最小能力，便于本工具被普通手机图标、背景和剧情头像复用。
 */
type AssetResolverContext = {
  asset: { resolve(uri: string): { url: string } };
};

const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * 将浏览器本地图片读取为可写入 shared 存档的 Data URL。
 *
 * @param file 用户从文件选择器选取的文件；仅信任其 MIME 类型和文件大小，不负责解码内容校验。
 * @param maxBytes 调用方针对背景或图标设置的最大字节数。
 * @returns PNG、JPEG 或 WebP 的 Data URL。
 * @throws 以 rejected Promise 返回格式不支持、文件超限或 FileReader 读取失败的中文错误。
 */
export function readImage(file: File, maxBytes: number): Promise<string> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new Error("仅支持 PNG、JPEG 或 WebP 图片"));
  }
  if (file.size > maxBytes) {
    return Promise.reject(new Error(`图片不能超过 ${Math.round(maxBytes / 1024)} KB`));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

/**
 * 生成无图片时使用的文字占位。
 * 按 Unicode code point 而非 UTF-16 code unit 取首字符，避免截断 emoji 等代理对字符。
 */
export function firstGlyph(value: string): string {
  return Array.from(value.trim())[0]?.toUpperCase() ?? "?";
}

/**
 * 将 Studio 素材 URI 转换为可赋给 HTML 图片元素的 URL。
 *
 * @param ctx 当前扩展上下文的素材解析能力。
 * @param source Studio 的相对素材引用、完整 `local://` URI，或玩家上传的 data image；空值直接视为没有素材。
 * @returns 可渲染 URL；完整 URI 直接保留，相对引用经 SDK 解析；解析失败时记录警告并返回 `undefined`，由调用方回退为文字或下一张候选图片。
 */
export function resolveAssetUrl(
  ctx: AssetResolverContext,
  source?: string,
): string | undefined {
  if (!source) return undefined;
  // 角色的 avatarUri / portrait.uri 在 Player 中可能已是完整 local URI。
  // 再交给 asset.resolve 会被误当作相对 assets/ 路径，生成 `assets/local:///...`。
  if (source.startsWith("data:image/") || source.startsWith("local://")) return source;
  try {
    return ctx.asset.resolve(source).url;
  } catch (error) {
    console.warn("[phone] 无法解析图片素材", source, error);
    return undefined;
  }
}
