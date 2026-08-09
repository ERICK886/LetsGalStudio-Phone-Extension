<!--
  @file 2026-08-09-phone-album-video-design.md
  @description 手机相册视频体验补齐：缩略图 + 手机风查看器
  @author 池水三两升
  @date 2026-08-09
  @version 1.0.0
-->

# 手机相册：视频体验补齐

## 范围

仅 `src/phone-album/`。查看器已有原生 `<video controls>`；本次补齐网格缩略与手机风控件。

## 决策

1. 缩略：`posterAsset` → 视频抽帧 → 占位 + ▶  
2. 查看器：手机风自定义控件（播放/暂停、进度、时长、静音；点画面显隐；单击切换播放）  
3. `durationSec` 可选手填；未填时播放后用 `video.duration` 仅作 UI 展示  

## 数据

`AlbumMedia` / `DefaultMediaSeed` / `MediaView` 增加可选 `posterAsset?: string`。

## 非目标

- 玩家上传、倍速、视频页左右滑切页  
- 抽帧结果写入存档  
