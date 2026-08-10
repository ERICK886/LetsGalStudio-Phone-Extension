# 手机桌面 APP 角标 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development.

**Goal:** phone-sdk 桌面角标 API + UI；聊天同步总未读。

**Architecture:** 全局槽位内存态；plugin set/clear；宿主订阅渲染；打开内页 clear。

**Tech Stack:** TypeScript, React, node:test

## Global Constraints

- phone-sdk 0.5.4；dot|count；99+；打开 clear；仅内存；chat 用 count
- Spec: docs/superpowers/specs/2026-08-10-phone-app-badge-design.md

### Task 1: badge store + API + tests
### Task 2: host UI + clear on open
### Task 3: chat syncDesktopBadge
### Task 4: docs + build
