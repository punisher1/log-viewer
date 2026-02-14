# Log Viewer - 日志浏览器设计文档

## 概述

一个高性能的跨平台日志浏览器，支持大文件按需加载、快速搜索、语法高亮和跳转功能。后续版本将集成大模型实现语义搜索和数据分析。

## 技术选型

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.0 |
| 前端框架 | React 18 + TypeScript |
| UI组件 | TailwindCSS + shadcn/ui |
| 状态管理 | Zustand |
| 日志渲染 | Monaco Editor |
| 后端语言 | Rust |
| 搜索引擎 | grep crate (ripgrep核心库) |
| 本地存储 | SQLite + rusqlite |
| 大文件读取 | memmap2 |
| 向量存储 | sqlite-vec (后续) |

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri Desktop App                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                              │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │  文件管理   │   搜索面板  │   编辑器    │  状态栏     │  │
│  │  FileTree   │ SearchPanel │  LogViewer  │  StatusBar  │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
│                    ↓ Tauri IPC (invoke)                     │
├─────────────────────────────────────────────────────────────┤
│  Backend (Rust)                                             │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ FileLoader  │ IndexStore  │ SearchEngine│ LLMClient   │  │
│  │ (mmap读取)  │ (SQLite)    │ (grep crate)│(可配置后端) │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 核心模块设计

### 1. 文件加载模块 (FileLoader)

**核心策略**: 虚拟滚动 + 行索引文件

**原理**:
- 首次打开大文件时，后台异步构建行索引（每行的offset和length）
- 索引存储在SQLite中，后续打开秒开
- 前端使用虚拟滚动，只渲染可视区域的行
- Rust后端通过mmap按需读取指定行

**数据结构**:

```rust
struct FileIndex {
    path: PathBuf,
    total_lines: u64,
    line_offsets: Vec<u64>,  // 每行的字节偏移量
    file_size: u64,
    encoding: FileEncoding,
    indexed_at: DateTime<Utc>,
}
```

**核心接口**:

```rust
impl FileLoader {
    // 异步构建行索引（首次打开）
    async fn build_index(&self, path: &Path) -> Result<FileIndex>;

    // 按需读取指定行范围
    fn read_lines(&self, index: &FileIndex, start: u64, count: u64)
        -> Result<Vec<String>>;

    // 流式读取（用于搜索）
    fn stream_chunks(&self, path: &Path, chunk_size: usize)
        -> impl Stream<Item=Bytes>;
}
```

### 2. 搜索模块 (SearchEngine)

基于 grep crate (ripgrep核心库) 实现。

**搜索选项**:

```rust
struct SearchOptions {
    pattern: String,
    case_sensitive: bool,
    regex_mode: bool,
    whole_word: bool,
    multiline: bool,
}
```

**核心接口**:

```rust
impl SearchEngine {
    // 搜索返回匹配行号（不返回内容，节省内存）
    fn search(&self, path: &Path, opts: SearchOptions)
        -> Result<Vec<MatchResult>>;

    // 流式搜索（超大文件，避免一次性返回过多结果）
    fn search_stream(&self, path: &Path, opts: SearchOptions)
        -> impl Stream<Item=MatchResult>;
}

struct MatchResult {
    line_number: u64,
    column_start: u32,
    column_end: u32,
    context_before: Option<String>,
    context_after: Option<String>,
}
```

### 3. 前端状态管理 (Zustand)

```typescript
interface LogViewerState {
  // 文件管理
  openFiles: Map<string, FileTab>;
  activeFileId: string | null;

  // 视图状态
  visibleRange: { start: number; end: number };
  scrollToLine: number | null;

  // 搜索状态
  searchResults: Map<string, SearchResult[]>;
  currentMatchIndex: number;

  // 高亮配置
  highlights: HighlightRule[];
}

interface FileTab {
  id: string;
  path: string;
  totalLines: number;
  isIndexed: boolean;
  encoding: string;
}
```

## 前端UI设计

```
┌─────────────────────────────────────────────────────────────────┐
│ FileDropZone (拖拽打开文件)                                      │
├───────────────┬─────────────────────────────────────────────────┤
│ Sidebar       │  Main Content                                   │
│ ┌───────────┐ │  ┌─────────────────────────────────────────────┐│
│ │ FileTree  │ │  │ TabBar                                      ││
│ │ (目录树)  │ │  │ [app.log] [error.log] [debug.log]    [+]   ││
│ └───────────┘ │  ├─────────────────────────────────────────────┤│
│ ┌───────────┐ │  │ SearchBar                                   ││
│ │ RecentFiles│ │  │ [关键词/正则] [Aa] [.*] [搜索] 结果: 128   ││
│ └───────────┘ │  ├─────────────────────────────────────────────┤│
│               │  │ LogViewer (Monaco Editor)                   ││
│               │  │ ┌─────────────────────────────────────────┐ ││
│               │  │ │ 1001 │ INFO  Starting service...        │ ││
│               │  │ │ 1002 │ ERROR Connection failed  ←高亮   │ ││
│               │  │ │ 1003 │ DEBUG Retrying...                │ ││
│               │  │ │ ...  │ (虚拟滚动，固定DOM节点)           │ ││
│               │  │ └─────────────────────────────────────────┘ ││
│               │  ├─────────────────────────────────────────────┤│
│               │  │ StatusBar                                   ││
│               │  │ app.log | 10,000行 | UTF-8 | 行:1002 列:1  ││
└───────────────┴──┴─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 核心组件

| 组件 | 职责 |
|------|------|
| `FileTree` | 目录树浏览、多选加载 |
| `TabBar` | 多文件标签页管理 |
| `SearchBar` | 搜索输入、选项切换、结果统计 |
| `LogViewer` | 虚拟滚动日志显示、高亮渲染 |
| `StatusBar` | 文件信息、当前位置、编码 |
| `JumpDialog` | 快捷键 Cmd+G 跳转到指定行 |

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + O` | 打开文件/目录 |
| `Cmd/Ctrl + F` | 搜索 |
| `Cmd/Ctrl + G` | 跳转到行 |
| `F3 / Shift+F3` | 下一个/上一个匹配 |
| `Cmd/Ctrl + W` | 关闭当前标签 |

## 前后端交互

### IPC 接口

```typescript
const commands = {
  // 文件操作
  'open_file': (path: string) => Promise<FileMeta>,
  'open_directory': (path: string) => Promise<FileMeta[]>,
  'read_lines': (path: string, start: number, count: number)
    => Promise<string[]>,

  // 索引操作
  'get_index_status': (path: string) => Promise<IndexStatus>,
  'build_index': (path: string) => Promise<void>,

  // 搜索操作
  'search': (path: string, options: SearchOptions)
    => Promise<SearchResult>,
  'search_cancel': (searchId: string) => Promise<void>,
}
```

### 虚拟滚动数据流

```
用户滚动 → onViewportChange事件
    │
    ▼
计算新的可见范围 {start, end}
    │
    ▼
判断是否需要加载更多
    │
    ├── 首屏已加载 → 直接渲染
    │
    └── 需要新数据 → read_lines(path, start, count)
                        │
                        ▼
                    更新 Monaco Editor 内容
```

**性能保证**: DOM节点数量固定，始终只渲染可视区域+缓冲区，不会随文件大小增长而变慢。

## 项目结构

```
log-viewer/
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs              # 入口
│   │   ├── commands/            # IPC 命令
│   │   │   ├── mod.rs
│   │   │   ├── file.rs          # 文件操作
│   │   │   ├── search.rs        # 搜索操作
│   │   │   └── index.rs         # 索引操作
│   │   ├── loader/              # 文件加载
│   │   │   ├── mod.rs
│   │   │   ├── mmap_reader.rs
│   │   │   └── encoding.rs
│   │   ├── search/              # 搜索引擎
│   │   │   ├── mod.rs
│   │   │   └── ripgrep.rs
│   │   ├── storage/             # 数据存储
│   │   │   ├── mod.rs
│   │   │   └── sqlite.rs
│   │   └── llm/                 # 大模型（后续）
│   │       ├── mod.rs
│   │       ├── openai.rs
│   │       ├── anthropic.rs
│   │       └── ollama.rs
│   └── Cargo.toml
│
├── src/                          # React 前端
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── FileTree/
│   │   ├── TabBar/
│   │   ├── SearchBar/
│   │   ├── LogViewer/
│   │   ├── StatusBar/
│   │   └── JumpDialog/
│   ├── hooks/
│   │   ├── useFileLoader.ts
│   │   ├── useSearch.ts
│   │   └── useVirtualScroll.ts
│   ├── stores/
│   │   └── logViewerStore.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── highlight.ts
│
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## 迭代规划

### V1 - MVP (当前)

- [x] 大文件按需加载（虚拟滚动 + 行索引）
- [x] 关键词/正则搜索（ripgrep）
- [x] 大小写敏感选项
- [x] 搜索结果高亮
- [x] 行号跳转
- [x] 多文件标签页
- [x] 目录批量加载

### V2 - 语义搜索

```
日志文件 → 分块 → Embedding → 存入 sqlite-vec
                              │
用户输入问题 → Embedding → 向量相似度搜索 → 返回相关日志片段
```

- [ ] Embedding 生成（支持多后端）
- [ ] 向量存储（sqlite-vec）
- [ ] 语义搜索界面

### V3 - 数据分析

- [ ] LLM 生成分析脚本
- [ ] 自动提取日志模式
- [ ] 异常检测与统计报告
