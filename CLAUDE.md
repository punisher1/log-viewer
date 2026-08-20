# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基于 Tauri v2 的桌面日志查看器应用，支持大文件的快速索引和搜索。

**技术栈**: Tauri v2 + React 19 + TypeScript + Vite + Tailwind CSS + Zustand + Monaco Editor + Rust

## 常用命令

```bash
# 前端开发
bun run dev          # 启动 Vite 开发服务器 (端口 1420)

# Tauri 开发
bun run tauri dev    # 启动完整应用（前端 + Rust 后端）

# 构建
bun run build        # 构建前端
bun run tauri build  # 构建生产版本

# Rust
cd src-tauri && cargo test        # 运行 Rust 测试
cd src-tauri && cargo clippy      # Rust lint
```

## 架构

### 前端 (src/)

```
src/
├── api/tauri.ts          # Tauri IPC 调用封装
├── stores/logViewerStore.ts  # Zustand 全局状态
├── components/           # UI 组件
│   ├── FileOpener/       # 文件拖放/选择
│   ├── LogViewer/        # Monaco 编辑器封装
│   ├── SearchBar/        # 搜索栏
│   ├── TabBar/           # 多标签页
│   ├── StatusBar/        # 状态栏
│   └── JumpDialog/       # 行号跳转对话框
└── types/index.ts        # TypeScript 类型定义
```

### 后端 (src-tauri/src/)

```
src-tauri/src/
├── lib.rs              # 应用入口，注册命令和状态
├── commands/mod.rs     # Tauri 命令定义 (API 端点)
├── loader/file_loader.rs  # 文件加载器：mmap + 行偏移索引
├── storage/database.rs    # SQLite 持久化（行索引缓存）
├── search/ripgrep.rs      # 基于 grep crate 的搜索
└── models/file_index.rs   # 数据模型
```

### 数据流

1. 用户打开文件 → `open_file` 命令获取元数据
2. 首次打开大文件 → `build_index` 构建行偏移索引并缓存到 SQLite
3. 滚动时 → `read_lines` 按需读取指定行范围
4. 搜索 → `search` 使用 ripgrep 搜索

### 关键设计

- **大文件支持**: 使用 `mmap` 映射文件，构建行偏移索引实现 O(1) 行定位
- **索引缓存**: 行偏移索引存储在 SQLite 中，避免重复构建
- **编码检测**: 自动检测 UTF-8/GBK/Latin1 编码
- **虚拟滚动**: Monaco Editor + 按需加载，只渲染可见区域

## Tauri 权限配置

权限定义在 `src-tauri/capabilities/default.json`。添加新的 Tauri 功能时需要在此配置权限。
