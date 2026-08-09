/**
 * @file index.ts
 * @description phone-album domain 层统一出口。
 * @author 池水三两升
 * @date 2026-08-09
 * @version 0.1.0
 */

export { normalizeId } from "./id.js";
export { parseCommaIds, parseMediaType } from "./parse.js";
export {
  buildAlbumCatalog,
  listVisibleAlbumIds,
  type AlbumCatalog,
} from "./merge.js";
export {
  applyAddAlbum,
  applyAddMedia,
  applyRemoveAlbum,
  applyRemoveMedia,
  applySetMediaAlbums,
} from "./mutations.js";
