# Log Viewer MVP 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个高性能跨平台日志浏览器，支持大文件按需加载、快速搜索、高亮和跳转。

**Architecture:** Tauri 2.0 桌面应用，Rust后端处理文件索引和搜索（mmap + grep crate），React前端负责虚拟滚动UI（Monaco Editor），通过IPC通信。

**Tech Stack:** Tauri 2.0, React 18, TypeScript, TailwindCSS, Zustand, Monaco Editor, Rust, grep crate, memmap2, SQLite

---

## Phase 1: 项目初始化

### Task 1: 初始化 Tauri 项目

**Files:**
- Create: 整个项目骨架

**Step 1: 创建 Tauri 项目**

```bash
npm create tauri-app@latest log-viewer -- --template react-ts
cd log-viewer
```

选择选项：
- Package manager: npm
- UI template: React + TypeScript
- UI flavor: TypeScript

**Step 2: 验证项目创建成功**

```bash
ls -la
```

Expected: 看到 `src-tauri/`, `src/`, `package.json` 等文件

**Step 3: 安装前端依赖**

```bash
npm install
```

**Step 4: 验证开发环境**

```bash
npm run tauri dev
```

Expected: 应用窗口打开，显示默认 React 页面

**Step 5: Commit**

```bash
git add .
git commit -m "chore: 初始化 Tauri + React 项目"
```

---

### Task 2: 配置前端工具链

**Files:**
- Create: `tailwind.config.js`
- Create: `src/index.css`
- Modify: `src/App.tsx`

**Step 1: 安装 TailwindCSS 和 shadcn/ui**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: 配置 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 3: 更新 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
}
```

**Step 4: 安装 Zustand 和 Monaco Editor**

```bash
npm install zustand @monaco-editor/react
```

**Step 5: 验证样式生效**

修改 `src/App.tsx`:

```tsx
function App() {
  return (
    <div className="h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold">Log Viewer</h1>
    </div>
  )
}

export default App
```

**Step 6: 运行验证**

```bash
npm run tauri dev
```

Expected: 窗口显示深色背景的 "Log Viewer" 标题

**Step 7: Commit**

```bash
git add .
git commit -m "chore: 配置 TailwindCSS 和基础依赖"
```

---

### Task 3: 配置 Rust 后端依赖

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1: 添加 Rust 依赖**

在 `src-tauri/Cargo.toml` 的 `[dependencies]` 部分添加：

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
memmap2 = "0.9"
rusqlite = { version = "0.32", features = ["bundled"] }
grep = "0.3"
grep-regex = "0.1"
grep-searcher = "0.1"
tokio = { version = "1", features = ["full"] }
encoding_rs = "0.8"
chrono = { version = "0.4", features = ["serde"] }
thiserror = "2"
```

**Step 2: 构建验证依赖可用**

```bash
cd src-tauri && cargo check
```

Expected: 无错误输出

**Step 3: Commit**

```bash
git add src-tauri/Cargo.toml
git commit -m "chore: 添加 Rust 后端依赖"
```

---

## Phase 2: 后端核心模块

### Task 4: 实现文件索引数据结构

**Files:**
- Create: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/src/models/file_index.rs`

**Step 1: 创建 models 模块**

创建 `src-tauri/src/models/mod.rs`:

```rust
pub mod file_index;

pub use file_index::*;
```

**Step 2: 定义 FileIndex 结构**

创建 `src-tauri/src/models/file_index.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileEncoding {
    Utf8,
    Gbk,
    Latin1,
    Unknown,
}

impl Default for FileEncoding {
    fn default() -> Self {
        Self::Utf8
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileIndex {
    pub path: String,
    pub total_lines: u64,
    pub line_offsets: Vec<u64>,
    pub file_size: u64,
    pub encoding: FileEncoding,
    pub indexed_at: DateTime<Utc>,
}

impl FileIndex {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path: path.to_string_lossy().to_string(),
            total_lines: 0,
            line_offsets: Vec::new(),
            file_size: 0,
            encoding: FileEncoding::default(),
            indexed_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMeta {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub total_lines: Option<u64>,
    pub is_indexed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStatus {
    pub indexed: bool,
    pub total_lines: u64,
    pub indexed_at: Option<String>,
}
```

**Step 3: 更新 main.rs 引入模块**

在 `src-tauri/src/main.rs` 顶部添加：

```rust
mod models;

pub use models::*;
```

**Step 4: 验证编译**

```bash
cd src-tauri && cargo check
```

Expected: 无错误

**Step 5: Commit**

```bash
git add src-tauri/src/models/ src-tauri/src/main.rs
git commit -m "feat(backend): 添加文件索引数据结构"
```

---

### Task 5: 实现 SQLite 存储层

**Files:**
- Create: `src-tauri/src/storage/mod.rs`
- Create: `src-tauri/src/storage/database.rs`

**Step 1: 创建 storage 模块**

创建 `src-tauri/src/storage/mod.rs`:

```rust
pub mod database;

pub use database::*;
```

**Step 2: 实现数据库层**

创建 `src-tauri/src/storage/database.rs`:

```rust
use rusqlite::{Connection, params};
use std::path::PathBuf;
use crate::models::{FileIndex, FileEncoding, IndexStatus};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, StorageError> {
        std::fs::create_dir_all(&app_data_dir)?;
        let db_path = app_data_dir.join("logviewer.db");
        let conn = Connection::open(db_path)?;
        let db = Self { conn };
        db.initialize()?;
        Ok(db)
    }

    fn initialize(&self) -> Result<(), StorageError> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS file_indices (
                path TEXT PRIMARY KEY,
                total_lines INTEGER NOT NULL,
                line_offsets BLOB NOT NULL,
                file_size INTEGER NOT NULL,
                encoding TEXT NOT NULL,
                file_mtime INTEGER NOT NULL,
                indexed_at TEXT NOT NULL
            )",
            [],
        )?;
        Ok(())
    }

    pub fn save_index(&self, index: &FileIndex, file_mtime: u64) -> Result<(), StorageError> {
        let offsets_bytes: Vec<u8> = index.line_offsets
            .iter()
            .flat_map(|&v| v.to_le_bytes())
            .collect();

        self.conn.execute(
            "INSERT OR REPLACE INTO file_indices
             (path, total_lines, line_offsets, file_size, encoding, file_mtime, indexed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                index.path,
                index.total_lines as i64,
                offsets_bytes,
                index.file_size as i64,
                match index.encoding {
                    FileEncoding::Utf8 => "utf8",
                    FileEncoding::Gbk => "gbk",
                    FileEncoding::Latin1 => "latin1",
                    FileEncoding::Unknown => "unknown",
                },
                file_mtime as i64,
                index.indexed_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    pub fn get_index(&self, path: &str) -> Result<Option<FileIndex>, StorageError> {
        let mut stmt = self.conn.prepare(
            "SELECT total_lines, line_offsets, file_size, encoding, indexed_at
             FROM file_indices WHERE path = ?1"
        )?;

        let result = stmt.query_row(params![path], |row| {
            let total_lines: i64 = row.get(0)?;
            let offsets_blob: Vec<u8> = row.get(1)?;
            let file_size: i64 = row.get(2)?;
            let encoding_str: String = row.get(3)?;
            let indexed_at_str: String = row.get(4)?;

            let line_offsets: Vec<u64> = offsets_blob
                .chunks_exact(8)
                .map(|chunk| u64::from_le_bytes(chunk.try_into().unwrap()))
                .collect();

            let encoding = match encoding_str.as_str() {
                "utf8" => FileEncoding::Utf8,
                "gbk" => FileEncoding::Gbk,
                "latin1" => FileEncoding::Latin1,
                _ => FileEncoding::Unknown,
            };

            let indexed_at = chrono::DateTime::parse_from_rfc3339(&indexed_at_str)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now());

            Ok(FileIndex {
                path: path.to_string(),
                total_lines: total_lines as u64,
                line_offsets,
                file_size: file_size as u64,
                encoding,
                indexed_at,
            })
        });

        match result {
            Ok(index) => Ok(Some(index)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(StorageError::Database(e)),
        }
    }

    pub fn get_index_status(&self, path: &str) -> Result<IndexStatus, StorageError> {
        match self.get_index(path)? {
            Some(index) => Ok(IndexStatus {
                indexed: true,
                total_lines: index.total_lines,
                indexed_at: Some(index.indexed_at.to_rfc3339()),
            }),
            None => Ok(IndexStatus {
                indexed: false,
                total_lines: 0,
                indexed_at: None,
            }),
        }
    }

    pub fn delete_index(&self, path: &str) -> Result<(), StorageError> {
        self.conn.execute("DELETE FROM file_indices WHERE path = ?1", params![path])?;
        Ok(())
    }
}
```

**Step 3: 更新 main.rs**

在 `src-tauri/src/main.rs` 添加：

```rust
mod storage;
```

**Step 4: 验证编译**

```bash
cd src-tauri && cargo check
```

**Step 5: Commit**

```bash
git add src-tauri/src/storage/ src-tauri/src/main.rs
git commit -m "feat(backend): 实现 SQLite 存储层"
```

---

### Task 6: 实现文件加载器

**Files:**
- Create: `src-tauri/src/loader/mod.rs`
- Create: `src-tauri/src/loader/file_loader.rs`

**Step 1: 创建 loader 模块**

创建 `src-tauri/src/loader/mod.rs`:

```rust
pub mod file_loader;

pub use file_loader::*;
```

**Step 2: 实现文件加载器**

创建 `src-tauri/src/loader/file_loader.rs`:

```rust
use memmap2::Mmap;
use std::fs::File;
use std::path::Path;
use std::sync::Arc;
use crate::models::{FileIndex, FileEncoding, FileMeta};
use crate::storage::Database;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LoaderError {
    #[error("File not found: {0}")]
    NotFound(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Storage error: {0}")]
    Storage(#[from] crate::storage::StorageError),
}

pub struct FileLoader {
    db: Arc<Database>,
}

impl FileLoader {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub fn get_file_meta(&self, path: &Path) -> Result<FileMeta, LoaderError> {
        if !path.exists() {
            return Err(LoaderError::NotFound(path.display().to_string()));
        }

        let metadata = std::fs::metadata(path)?;
        let name = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let path_str = path.to_string_lossy().to_string();
        let index_status = self.db.get_index_status(&path_str)?;

        Ok(FileMeta {
            path: path_str,
            name,
            size: metadata.len(),
            total_lines: if index_status.indexed {
                Some(index_status.total_lines)
            } else {
                None
            },
            is_indexed: index_status.indexed,
        })
    }

    pub fn build_index(&self, path: &Path) -> Result<FileIndex, LoaderError> {
        let file = File::open(path)?;
        let metadata = file.metadata()?;
        let file_size = metadata.len();
        let file_mtime = metadata.modified()?
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // 使用 mmap 读取文件
        let mmap = unsafe { Mmap::map(&file)? };

        // 构建行索引
        let mut line_offsets = Vec::new();
        let mut current_offset: u64 = 0;
        let mut total_lines: u64 = 0;

        for byte in mmap.iter() {
            if *byte == b'\n' {
                line_offsets.push(current_offset);
                total_lines += 1;
            }
            current_offset += 1;
        }

        // 如果文件不以换行符结尾，也要计算最后一行
        if !mmap.is_empty() && mmap[mmap.len() - 1] != b'\n' {
            line_offsets.push(current_offset);
            total_lines += 1;
        }

        let encoding = self.detect_encoding(&mmap);

        let index = FileIndex {
            path: path.to_string_lossy().to_string(),
            total_lines,
            line_offsets,
            file_size,
            encoding,
            indexed_at: chrono::Utc::now(),
        };

        // 保存到数据库
        self.db.save_index(&index, file_mtime)?;

        Ok(index)
    }

    pub fn read_lines(
        &self,
        path: &Path,
        start: u64,
        count: u64,
    ) -> Result<Vec<String>, LoaderError> {
        let path_str = path.to_string_lossy().to_string();
        let index = self.db.get_index(&path_str)?
            .ok_or_else(|| LoaderError::NotFound("Index not found".to_string()))?;

        let file = File::open(path)?;
        let mmap = unsafe { Mmap::map(&file)? };

        let end = std::cmp::min(start + count, index.total_lines);
        let mut lines = Vec::new();

        for line_num in start..end {
            let offset = index.line_offsets[line_num as usize] as usize;
            let next_offset = if (line_num + 1) < index.total_lines {
                index.line_offsets[(line_num + 1) as usize] as usize
            } else {
                mmap.len()
            };

            let line_bytes = &mmap[offset..next_offset];
            let line_str = match index.encoding {
                FileEncoding::Utf8 => String::from_utf8_lossy(line_bytes).into_owned(),
                FileEncoding::Gbk => {
                    encoding_rs::GBK.decode(line_bytes).0.into_owned()
                }
                _ => String::from_utf8_lossy(line_bytes).into_owned(),
            };

            // 去除行尾换行符
            lines.push(line_str.trim_end().to_string());
        }

        Ok(lines)
    }

    fn detect_encoding(&self, data: &[u8]) -> FileEncoding {
        // 简单的编码检测
        if data.starts_with(&[0xEF, 0xBB, 0xBF]) {
            return FileEncoding::Utf8;
        }

        // 尝试 UTF-8
        if std::str::from_utf8(data).is_ok() {
            return FileEncoding::Utf8;
        }

        // 尝试 GBK（简单检测：检查常见的 GBK 字节模式）
        for window in data.windows(2) {
            if (window[0] >= 0x81 && window[0] <= 0xFE) &&
               ((window[1] >= 0x40 && window[1] <= 0x7E) ||
                (window[1] >= 0x80 && window[1] <= 0xFE)) {
                return FileEncoding::Gbk;
            }
        }

        FileEncoding::Latin1
    }
}
```

**Step 3: 更新 main.rs**

```rust
mod loader;
```

**Step 4: 验证编译**

```bash
cd src-tauri && cargo check
```

**Step 5: Commit**

```bash
git add src-tauri/src/loader/ src-tauri/src/main.rs
git commit -m "feat(backend): 实现文件加载器和索引构建"
```

---

### Task 7: 实现搜索引擎

**Files:**
- Create: `src-tauri/src/search/mod.rs`
- Create: `src-tauri/src/search/ripgrep.rs`

**Step 1: 创建 search 模块**

创建 `src-tauri/src/search/mod.rs`:

```rust
pub mod ripgrep;

pub use ripgrep::*;
```

**Step 2: 实现 ripgrep 搜索**

创建 `src-tauri/src/search/ripgrep.rs`:

```rust
use grep::regex::RegexMatcher;
use grep::searcher::sinks::UTF8;
use grep::searcher::{Searcher, SinkMatch};
use serde::{Deserialize, Serialize};
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SearchError {
    #[error("Regex error: {0}")]
    Regex(#[from] grep::regex::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
    pub pattern: String,
    pub case_sensitive: bool,
    pub regex_mode: bool,
    pub whole_word: bool,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            pattern: String::new(),
            case_sensitive: false,
            regex_mode: false,
            whole_word: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResult {
    pub line_number: u64,
    pub column_start: u32,
    pub column_end: u32,
    pub line_content: String,
}

pub struct SearchEngine;

impl SearchEngine {
    pub fn new() -> Self {
        Self
    }

    pub fn search(
        &self,
        path: &Path,
        options: &SearchOptions,
    ) -> Result<Vec<MatchResult>, SearchError> {
        let mut results = Vec::new();

        // 构建匹配模式
        let pattern = if options.whole_word && !options.regex_mode {
            format!(r"\b{}\b", regex::escape(&options.pattern))
        } else if !options.regex_mode {
            regex::escape(&options.pattern)
        } else {
            options.pattern.clone()
        };

        // 构建 matcher
        let matcher = RegexMatcher::new(&pattern)?;

        let mut searcher = Searcher::new();

        let case_sensitive = options.case_sensitive;

        searcher.search_path(
            &matcher,
            path,
            UTF8(|line_num, mat: SinkMatch| {
                let line = mat.bytes();
                let line_str = String::from_utf8_lossy(line).to_string();

                // 获取匹配位置
                let mat_bytes = mat.bytes();
                let mat_start = mat.range().start;
                let mat_end = mat.range().end;

                results.push(MatchResult {
                    line_number: line_num,
                    column_start: mat_start as u32,
                    column_end: mat_end as u32,
                    line_content: line_str.trim_end().to_string(),
                });

                Ok(true)
            }),
        )?;

        Ok(results)
    }
}
```

**Step 3: 添加 regex 依赖**

在 `src-tauri/Cargo.toml` 添加：

```toml
regex = "1"
```

**Step 4: 更新 main.rs**

```rust
mod search;
```

**Step 5: 验证编译**

```bash
cd src-tauri && cargo check
```

**Step 6: Commit**

```bash
git add src-tauri/src/search/ src-tauri/src/main.rs src-tauri/Cargo.toml
git commit -m "feat(backend): 实现 ripgrep 搜索引擎"
```

---

### Task 8: 实现 Tauri IPC 命令

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: 创建 commands 模块**

创建 `src-tauri/src/commands/mod.rs`:

```rust
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use crate::loader::FileLoader;
use crate::search::{SearchEngine, SearchOptions, MatchResult};
use crate::models::{FileMeta, IndexStatus};

pub struct AppState {
    pub loader: Arc<FileLoader>,
    pub search_engine: Arc<SearchEngine>,
}

#[tauri::command]
pub async fn open_file(
    path: String,
    state: State<'_, AppState>,
) -> Result<FileMeta, String> {
    let path = PathBuf::from(&path);
    state.loader.get_file_meta(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn build_index(
    path: String,
    state: State<'_, AppState>,
) -> Result<crate::models::FileIndex, String> {
    let path = PathBuf::from(&path);
    state.loader.build_index(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_index_status(
    path: String,
    state: State<'_, AppState>,
) -> Result<IndexStatus, String> {
    state.loader.db.get_index_status(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_lines(
    path: String,
    start: u64,
    count: u64,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&path);
    state.loader.read_lines(&path, start, count)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search(
    path: String,
    options: SearchOptions,
    state: State<'_, AppState>,
) -> Result<Vec<MatchResult>, String> {
    let path = PathBuf::from(&path);
    state.search_engine.search(&path, &options)
        .map_err(|e| e.to_string())
}
```

**Step 2: 更新 lib.rs**

修改 `src-tauri/src/lib.rs`:

```rust
mod models;
mod storage;
mod loader;
mod search;
mod commands;

use std::sync::Arc;
use commands::AppState;
use storage::Database;
use loader::FileLoader;
use search::SearchEngine;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("log-viewer");

    let db = Arc::new(Database::new(app_data_dir).expect("Failed to init database"));
    let loader = Arc::new(FileLoader::new(db.clone()));
    let search_engine = Arc::new(SearchEngine::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState { loader, search_engine })
        .invoke_handler(tauri::generate_handler![
            commands::open_file,
            commands::build_index,
            commands::get_index_status,
            commands::read_lines,
            commands::search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Step 3: 添加 dirs 依赖**

在 `src-tauri/Cargo.toml` 添加：

```toml
dirs = "6"
```

**Step 4: 删除 main.rs 中的重复模块声明**

修改 `src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    log_viewer_lib::run()
}
```

**Step 5: 验证编译**

```bash
cd src-tauri && cargo check
```

**Step 6: Commit**

```bash
git add src-tauri/src/
git commit -m "feat(backend): 实现 Tauri IPC 命令"
```

---

## Phase 3: 前端实现

### Task 9: 创建前端类型定义

**Files:**
- Create: `src/types/index.ts`

**Step 1: 创建类型文件**

```typescript
// src/types/index.ts

export interface FileMeta {
  path: string;
  name: string;
  size: number;
  totalLines?: number;
  isIndexed: boolean;
}

export interface IndexStatus {
  indexed: boolean;
  totalLines: number;
  indexedAt?: string;
}

export interface SearchOptions {
  pattern: string;
  caseSensitive: boolean;
  regexMode: boolean;
  wholeWord: boolean;
}

export interface MatchResult {
  lineNumber: number;
  columnStart: number;
  columnEnd: number;
  lineContent: string;
}

export interface FileTab {
  id: string;
  path: string;
  name: string;
  totalLines: number;
  isIndexed: boolean;
  isActive: boolean;
}

export interface HighlightRule {
  id: string;
  pattern: string;
  color: string;
  enabled: boolean;
}

export interface SearchResult {
  fileId: string;
  matches: MatchResult[];
  currentMatchIndex: number;
}
```

**Step 2: Commit**

```bash
git add src/types/
git commit -m "feat(frontend): 添加类型定义"
```

---

### Task 10: 创建 Tauri API 封装

**Files:**
- Create: `src/api/tauri.ts`

**Step 1: 创建 API 封装**

```typescript
// src/api/tauri.ts
import { invoke } from '@tauri-apps/api/core';
import type { FileMeta, IndexStatus, SearchOptions, MatchResult } from '../types';

export async function openFile(path: string): Promise<FileMeta> {
  return invoke('open_file', { path });
}

export async function buildIndex(path: string): Promise<{
  path: string;
  totalLines: number;
}> {
  return invoke('build_index', { path });
}

export async function getIndexStatus(path: string): Promise<IndexStatus> {
  return invoke('get_index_status', { path });
}

export async function readLines(
  path: string,
  start: number,
  count: number
): Promise<string[]> {
  return invoke('read_lines', { path, start, count });
}

export async function search(
  path: string,
  options: SearchOptions
): Promise<MatchResult[]> {
  return invoke('search', { path, options });
}
```

**Step 2: 安装 Tauri API**

```bash
npm install @tauri-apps/api
```

**Step 3: Commit**

```bash
git add src/api/ package.json package-lock.json
git commit -m "feat(frontend): 添加 Tauri API 封装"
```

---

### Task 11: 创建 Zustand 状态管理

**Files:**
- Create: `src/stores/logViewerStore.ts`

**Step 1: 创建状态 store**

```typescript
// src/stores/logViewerStore.ts
import { create } from 'zustand';
import type { FileTab, SearchResult, HighlightRule } from '../types';

interface LogViewerState {
  // 文件管理
  openFiles: Map<string, FileTab>;
  activeFileId: string | null;

  // 视图状态
  visibleRange: { start: number; end: number };
  scrollToLine: number | null;

  // 搜索状态
  searchResults: Map<string, SearchResult>;
  searchOptions: {
    pattern: string;
    caseSensitive: boolean;
    regexMode: boolean;
    wholeWord: boolean;
  };

  // 高亮配置
  highlights: HighlightRule[];

  // 加载状态
  isLoading: boolean;
  loadingMessage: string;

  // Actions
  openFile: (file: FileTab) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;

  setVisibleRange: (range: { start: number; end: number }) => void;
  setScrollToLine: (line: number | null) => void;

  setSearchResults: (fileId: string, results: SearchResult) => void;
  clearSearchResults: (fileId: string) => void;
  setCurrentMatchIndex: (fileId: string, index: number) => void;
  setSearchOptions: (options: Partial<LogViewerState['searchOptions']>) => void;

  addHighlight: (rule: HighlightRule) => void;
  removeHighlight: (id: string) => void;
  toggleHighlight: (id: string) => void;

  setLoading: (loading: boolean, message?: string) => void;
}

export const useLogViewerStore = create<LogViewerState>((set) => ({
  // 初始状态
  openFiles: new Map(),
  activeFileId: null,
  visibleRange: { start: 0, end: 100 },
  scrollToLine: null,
  searchResults: new Map(),
  searchOptions: {
    pattern: '',
    caseSensitive: false,
    regexMode: false,
    wholeWord: false,
  },
  highlights: [],
  isLoading: false,
  loadingMessage: '',

  // Actions
  openFile: (file) =>
    set((state) => {
      const newFiles = new Map(state.openFiles);
      newFiles.set(file.id, { ...file, isActive: true });
      // 将其他文件设为非活动
      newFiles.forEach((f, id) => {
        if (id !== file.id) {
          newFiles.set(id, { ...f, isActive: false });
        }
      });
      return { openFiles: newFiles, activeFileId: file.id };
    }),

  closeFile: (fileId) =>
    set((state) => {
      const newFiles = new Map(state.openFiles);
      newFiles.delete(fileId);
      const newActiveId =
        state.activeFileId === fileId
          ? Array.from(newFiles.keys())[0] || null
          : state.activeFileId;
      return { openFiles: newFiles, activeFileId: newActiveId };
    }),

  setActiveFile: (fileId) =>
    set((state) => {
      const newFiles = new Map(state.openFiles);
      newFiles.forEach((f, id) => {
        newFiles.set(id, { ...f, isActive: id === fileId });
      });
      return { openFiles: newFiles, activeFileId: fileId };
    }),

  setVisibleRange: (range) => set({ visibleRange: range }),

  setScrollToLine: (line) => set({ scrollToLine: line }),

  setSearchResults: (fileId, results) =>
    set((state) => {
      const newResults = new Map(state.searchResults);
      newResults.set(fileId, results);
      return { searchResults: newResults };
    }),

  clearSearchResults: (fileId) =>
    set((state) => {
      const newResults = new Map(state.searchResults);
      newResults.delete(fileId);
      return { searchResults: newResults };
    }),

  setCurrentMatchIndex: (fileId, index) =>
    set((state) => {
      const newResults = new Map(state.searchResults);
      const result = newResults.get(fileId);
      if (result) {
        newResults.set(fileId, { ...result, currentMatchIndex: index });
      }
      return { searchResults: newResults };
    }),

  setSearchOptions: (options) =>
    set((state) => ({
      searchOptions: { ...state.searchOptions, ...options },
    })),

  addHighlight: (rule) =>
    set((state) => ({
      highlights: [...state.highlights, rule],
    })),

  removeHighlight: (id) =>
    set((state) => ({
      highlights: state.highlights.filter((h) => h.id !== id),
    })),

  toggleHighlight: (id) =>
    set((state) => ({
      highlights: state.highlights.map((h) =>
        h.id === id ? { ...h, enabled: !h.enabled } : h
      ),
    })),

  setLoading: (loading, message = '') =>
    set({ isLoading: loading, loadingMessage: message }),
}));
```

**Step 2: Commit**

```bash
git add src/stores/
git commit -m "feat(frontend): 添加 Zustand 状态管理"
```

---

### Task 12: 实现 LogViewer 核心组件

**Files:**
- Create: `src/components/LogViewer/index.tsx`

**Step 1: 创建 LogViewer 组件**

```tsx
// src/components/LogViewer/index.tsx
import { useEffect, useRef, useCallback, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useLogViewerStore } from '../../stores/logViewerStore';
import { readLines } from '../../api/tauri';

const LINES_PER_LOAD = 100;
const BUFFER_LINES = 20;

export function LogViewer() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const {
    openFiles,
    activeFileId,
    searchResults,
    scrollToLine,
    setVisibleRange,
    setLoading,
  } = useLogViewerStore();

  const activeFile = activeFileId ? openFiles.get(activeFileId) : null;
  const [loadedContent, setLoadedContent] = useState<string>('');
  const [visibleStart, setVisibleStart] = useState(0);

  // 加载内容
  const loadContent = useCallback(async (path: string, start: number, count: number) => {
    if (!path) return;
    setLoading(true, '加载中...');
    try {
      const lines = await readLines(path, start, count);
      return lines;
    } catch (error) {
      console.error('Failed to load lines:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  // 当活动文件变化时加载内容
  useEffect(() => {
    if (!activeFile) {
      setLoadedContent('');
      return;
    }

    loadContent(activeFile.path, 0, LINES_PER_LOAD * 3).then((lines) => {
      if (lines) {
        setLoadedContent(lines.join('\n'));
        setVisibleStart(0);
      }
    });
  }, [activeFile?.path, loadContent]);

  // 处理滚动，实现按需加载
  const handleScroll = useCallback(async (e: editor.IScrollEvent) => {
    if (!activeFile || !editorRef.current) return;

    const editor = editorRef.current;
    const scrollTop = e.scrollTop;
    const lineHeight = editor.getOption(monacoRef.current!.editor.EditorOption.lineHeight);
    const visibleHeight = editor.getLayoutInfo().height;

    const firstVisibleLine = Math.floor(scrollTop / lineHeight);
    const lastVisibleLine = Math.ceil((scrollTop + visibleHeight) / lineHeight);

    setVisibleRange({ start: firstVisibleLine, end: lastVisibleLine });

    // 预加载：当滚动到接近已加载内容的边界时，加载更多
    const loadedEndLine = visibleStart + LINES_PER_LOAD * 3;

    if (lastVisibleLine > loadedEndLine - BUFFER_LINES) {
      const newStart = loadedEndLine;
      const newLines = await loadContent(activeFile.path, newStart, LINES_PER_LOAD);
      if (newLines && newLines.length > 0) {
        setLoadedContent((prev) => prev + '\n' + newLines.join('\n'));
      }
    }
  }, [activeFile, visibleStart, loadContent, setVisibleRange]);

  // 处理跳转
  useEffect(() => {
    if (scrollToLine !== null && editorRef.current) {
      editorRef.current.revealLineInCenter(scrollToLine);
      editorRef.current.setPosition({ lineNumber: scrollToLine, column: 1 });
      useLogViewerStore.getState().setScrollToLine(null);
    }
  }, [scrollToLine]);

  // 处理搜索高亮
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activeFileId) return;

    const monaco = monacoRef.current;
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    // 清除旧的高亮
    const oldDecorations = editor.getModel()?.getAllDecorations() || [];
    editor.deltaDecorations(
      oldDecorations.map((d) => d.id),
      []
    );

    // 添加搜索结果高亮
    const searchResult = searchResults.get(activeFileId);
    if (searchResult && searchResult.matches.length > 0) {
      const decorations = searchResult.matches.map((match, index) => ({
        range: new monaco.Range(
          match.lineNumber + 1,
          match.columnStart + 1,
          match.lineNumber + 1,
          match.columnEnd + 1
        ),
        options: {
          className: index === searchResult.currentMatchIndex
            ? 'current-search-match'
            : 'search-match',
          inlineClassName: 'search-highlight',
        },
      }));

      editor.deltaDecorations([], decorations);
    }
  }, [searchResults, activeFileId]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 监听滚动事件
    editor.onDidScrollChange(handleScroll);

    // 定义高亮样式
    monaco.editor.defineTheme('log-viewer-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
      },
    });

    // 添加 CSS 样式
    const style = document.createElement('style');
    style.textContent = `
      .search-highlight {
        background-color: rgba(255, 200, 0, 0.4);
      }
      .current-search-match {
        background-color: rgba(255, 150, 0, 0.6);
        border: 1px solid #ff9500;
      }
    `;
    document.head.appendChild(style);
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
        <div className="text-center">
          <p className="text-lg">拖拽文件到此处打开</p>
          <p className="text-sm mt-2">或使用 Ctrl+O 选择文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        value={loadedContent}
        theme="vs-dark"
        options={{
          readOnly: true,
          minimap: { enabled: true },
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'off',
          fontSize: 13,
          fontFamily: 'Consolas, Monaco, monospace',
        }}
        onMount={handleEditorMount}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/LogViewer/
git commit -m "feat(frontend): 实现 LogViewer 核心组件"
```

---

### Task 13: 实现搜索栏组件

**Files:**
- Create: `src/components/SearchBar/index.tsx`

**Step 1: 创建 SearchBar 组件**

```tsx
// src/components/SearchBar/index.tsx
import { useState, useCallback } from 'react';
import { useLogViewerStore } from '../../stores/logViewerStore';
import { search } from '../../api/tauri';

export function SearchBar() {
  const {
    openFiles,
    activeFileId,
    searchOptions,
    searchResults,
    setSearchResults,
    setSearchOptions,
    setCurrentMatchIndex,
    setScrollToLine,
  } = useLogViewerStore();

  const [isSearching, setIsSearching] = useState(false);

  const activeFile = activeFileId ? openFiles.get(activeFileId) : null;
  const currentSearchResult = activeFileId ? searchResults.get(activeFileId) : null;

  const handleSearch = useCallback(async () => {
    if (!activeFile || !searchOptions.pattern) return;

    setIsSearching(true);
    try {
      const matches = await search(activeFile.path, {
        pattern: searchOptions.pattern,
        caseSensitive: searchOptions.caseSensitive,
        regexMode: searchOptions.regexMode,
        wholeWord: searchOptions.wholeWord,
      });

      setSearchResults(activeFileId!, {
        fileId: activeFileId!,
        matches,
        currentMatchIndex: 0,
      });

      // 跳转到第一个结果
      if (matches.length > 0) {
        setScrollToLine(matches[0].lineNumber);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [activeFile, searchOptions, activeFileId, setSearchResults, setScrollToLine]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePrevMatch = () => {
    if (!currentSearchResult || currentSearchResult.matches.length === 0) return;
    const newIndex =
      (currentSearchResult.currentMatchIndex - 1 + currentSearchResult.matches.length) %
      currentSearchResult.matches.length;
    setCurrentMatchIndex(activeFileId!, newIndex);
    setScrollToLine(currentSearchResult.matches[newIndex].lineNumber);
  };

  const handleNextMatch = () => {
    if (!currentSearchResult || currentSearchResult.matches.length === 0) return;
    const newIndex =
      (currentSearchResult.currentMatchIndex + 1) % currentSearchResult.matches.length;
    setCurrentMatchIndex(activeFileId!, newIndex);
    setScrollToLine(currentSearchResult.matches[newIndex].lineNumber);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
      <input
        type="text"
        placeholder="搜索..."
        value={searchOptions.pattern}
        onChange={(e) => setSearchOptions({ pattern: e.target.value })}
        onKeyDown={handleKeyDown}
        className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded border border-gray-600
                   focus:outline-none focus:border-blue-500"
      />

      <button
        onClick={() => setSearchOptions({ caseSensitive: !searchOptions.caseSensitive })}
        className={`px-2 py-1 rounded ${
          searchOptions.caseSensitive ? 'bg-blue-600' : 'bg-gray-700'
        } text-white hover:opacity-80`}
        title="区分大小写"
      >
        Aa
      </button>

      <button
        onClick={() => setSearchOptions({ regexMode: !searchOptions.regexMode })}
        className={`px-2 py-1 rounded ${
          searchOptions.regexMode ? 'bg-blue-600' : 'bg-gray-700'
        } text-white hover:opacity-80`}
        title="正则表达式"
      >
        .*
      </button>

      <button
        onClick={() => setSearchOptions({ wholeWord: !searchOptions.wholeWord })}
        className={`px-2 py-1 rounded ${
          searchOptions.wholeWord ? 'bg-blue-600' : 'bg-gray-700'
        } text-white hover:opacity-80`}
        title="全词匹配"
      >
        W
      </button>

      <button
        onClick={handleSearch}
        disabled={isSearching || !searchOptions.pattern}
        className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSearching ? '搜索中...' : '搜索'}
      </button>

      {currentSearchResult && (
        <div className="flex items-center gap-2 ml-2">
          <span className="text-gray-400 text-sm">
            {currentSearchResult.currentMatchIndex + 1} / {currentSearchResult.matches.length}
          </span>
          <button
            onClick={handlePrevMatch}
            disabled={currentSearchResult.matches.length === 0}
            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600
                       disabled:opacity-50"
          >
            ↑
          </button>
          <button
            onClick={handleNextMatch}
            disabled={currentSearchResult.matches.length === 0}
            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600
                       disabled:opacity-50"
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/SearchBar/
git commit -m "feat(frontend): 实现搜索栏组件"
```

---

### Task 14: 实现标签栏组件

**Files:**
- Create: `src/components/TabBar/index.tsx`

**Step 1: 创建 TabBar 组件**

```tsx
// src/components/TabBar/index.tsx
import { useLogViewerStore } from '../../stores/logViewerStore';

export function TabBar() {
  const { openFiles, activeFileId, setActiveFile, closeFile } = useLogViewerStore();

  const files = Array.from(openFiles.values());

  if (files.length === 0) return null;

  return (
    <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto">
      {files.map((file) => (
        <div
          key={file.id}
          className={`flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-gray-700
                     ${file.isActive ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          onClick={() => setActiveFile(file.id)}
        >
          <span className="truncate max-w-[200px]">{file.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeFile(file.id);
            }}
            className="ml-2 text-gray-500 hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/TabBar/
git commit -m "feat(frontend): 实现标签栏组件"
```

---

### Task 15: 实现状态栏组件

**Files:**
- Create: `src/components/StatusBar/index.tsx`

**Step 1: 创建 StatusBar 组件**

```tsx
// src/components/StatusBar/index.tsx
import { useLogViewerStore } from '../../stores/logViewerStore';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StatusBar() {
  const { openFiles, activeFileId, isLoading, loadingMessage } = useLogViewerStore();

  const activeFile = activeFileId ? openFiles.get(activeFileId) : null;

  if (!activeFile) {
    return (
      <div className="h-6 bg-gray-800 border-t border-gray-700 px-4 flex items-center text-xs text-gray-500">
        Log Viewer - 就绪
      </div>
    );
  }

  return (
    <div className="h-6 bg-gray-800 border-t border-gray-700 px-4 flex items-center justify-between text-xs text-gray-400">
      <div className="flex items-center gap-4">
        <span>{activeFile.name}</span>
        <span>{activeFile.totalLines.toLocaleString()} 行</span>
        <span>{formatFileSize(activeFile.size)}</span>
        <span>UTF-8</span>
      </div>
      <div className="flex items-center gap-4">
        {activeFile.isIndexed && <span className="text-green-400">已索引</span>}
        {isLoading && <span className="text-yellow-400">{loadingMessage}</span>}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/StatusBar/
git commit -m "feat(frontend): 实现状态栏组件"
```

---

### Task 16: 实现文件选择对话框

**Files:**
- Create: `src/components/FileOpener/index.tsx`
- Create: `src/hooks/useFileOpener.ts`

**Step 1: 创建 useFileOpener hook**

```typescript
// src/hooks/useFileOpener.ts
import { useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useLogViewerStore } from '../stores/logViewerStore';
import { openFile, buildIndex, getIndexStatus } from '../api/tauri';
import type { FileTab } from '../types';

export function useFileOpener() {
  const { openFile: openFileTab, setLoading } = useLogViewerStore();

  const openSingleFile = useCallback(async (path: string) => {
    setLoading(true, '正在打开文件...');

    try {
      const meta = await openFile(path);

      // 检查索引状态
      const status = await getIndexStatus(path);

      // 如果未索引，构建索引
      if (!status.indexed) {
        setLoading(true, '正在构建索引...');
        await buildIndex(path);
      }

      const tab: FileTab = {
        id: path,
        path: meta.path,
        name: meta.name,
        totalLines: status.indexed ? status.totalLines : 0,
        isIndexed: status.indexed,
        isActive: true,
      };

      openFileTab(tab);
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [openFileTab, setLoading]);

  const showOpenDialog = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Log Files', extensions: ['log', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (selected) {
      await openSingleFile(selected as string);
    }
  }, [openSingleFile]);

  return { openSingleFile, showOpenDialog };
}
```

**Step 2: 创建 FileOpener 组件（处理拖放和快捷键）**

```tsx
// src/components/FileOpener/index.tsx
import { useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useFileOpener } from '../../hooks/useFileOpener';

interface Props {
  children: React.ReactNode;
}

export function FileOpener({ children }: Props) {
  const { openSingleFile, showOpenDialog } = useFileOpener();

  // 监听文件拖放
  useEffect(() => {
    const unlisten = listen<string[]>('tauri://drag-drop', (event) => {
      const paths = event.payload;
      paths.forEach((path) => {
        openSingleFile(path);
      });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openSingleFile]);

  // 监听快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        showOpenDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOpenDialog]);

  return <>{children}</>;
}
```

**Step 3: 安装 dialog 插件依赖**

```bash
npm install @tauri-apps/plugin-dialog
```

**Step 4: Commit**

```bash
git add src/components/FileOpener/ src/hooks/useFileOpener.ts package.json package-lock.json
git commit -m "feat(frontend): 实现文件打开功能"
```

---

### Task 17: 组装主应用

**Files:**
- Modify: `src/App.tsx`

**Step 1: 更新 App.tsx**

```tsx
// src/App.tsx
import { FileOpener } from './components/FileOpener';
import { TabBar } from './components/TabBar';
import { SearchBar } from './components/SearchBar';
import { LogViewer } from './components/LogViewer';
import { StatusBar } from './components/StatusBar';

function App() {
  return (
    <FileOpener>
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        <TabBar />
        <SearchBar />
        <LogViewer />
        <StatusBar />
      </div>
    </FileOpener>
  );
}

export default App;
```

**Step 2: 验证应用运行**

```bash
npm run tauri dev
```

Expected: 应用窗口打开，显示日志浏览器界面

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: 组装主应用"
```

---

## Phase 4: 测试与完善

### Task 18: 添加跳转功能

**Files:**
- Create: `src/components/JumpDialog/index.tsx`

**Step 1: 创建跳转对话框**

```tsx
// src/components/JumpDialog/index.tsx
import { useState, useEffect, useCallback } from 'react';
import { useLogViewerStore } from '../../stores/logViewerStore';

export function JumpDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [lineNumber, setLineNumber] = useState('');
  const { openFiles, activeFileId, setScrollToLine } = useLogViewerStore();

  const activeFile = activeFileId ? openFiles.get(activeFileId) : null;

  // 监听快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleJump = useCallback(() => {
    const line = parseInt(lineNumber, 10);
    if (!isNaN(line) && line > 0 && activeFile && line <= activeFile.totalLines) {
      setScrollToLine(line);
      setIsOpen(false);
      setLineNumber('');
    }
  }, [lineNumber, activeFile, setScrollToLine]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJump();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-4 shadow-xl">
        <h3 className="text-lg font-medium mb-3">跳转到行</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={lineNumber}
            onChange={(e) => setLineNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="行号"
            className="w-32 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600
                       focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <span className="text-gray-400 text-sm">
            / {activeFile?.totalLines.toLocaleString() || 0}
          </span>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            取消
          </button>
          <button
            onClick={handleJump}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            跳转
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 更新 App.tsx 添加 JumpDialog**

```tsx
import { JumpDialog } from './components/JumpDialog';

// 在 return 的组件树中添加
<JumpDialog />
```

**Step 3: Commit**

```bash
git add src/components/JumpDialog/ src/App.tsx
git commit -m "feat(frontend): 添加行号跳转功能"
```

---

### Task 19: 配置 Tauri 权限

**Files:**
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/tauri.conf.json`

**Step 1: 配置权限**

创建或修改 `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:default",
    "dialog:default",
    {
      "identifier": "fs:allow-read-text-file",
      "allow": [{ "path": "$HOME/**" }, { "path": "/**" }]
    },
    {
      "identifier": "fs:allow-exists",
      "allow": [{ "path": "$HOME/**" }, { "path": "/**" }]
    },
    {
      "identifier": "fs:allow-stat",
      "allow": [{ "path": "$HOME/**" }, { "path": "/**" }]
    }
  ]
}
```

**Step 2: 更新 tauri.conf.json**

确保 `src-tauri/tauri.conf.json` 包含必要的插件配置：

```json
{
  "plugins": {
    "fs": {},
    "dialog": {}
  }
}
```

**Step 3: 验证构建**

```bash
npm run tauri build
```

Expected: 构建成功，生成安装包

**Step 4: Commit**

```bash
git add src-tauri/capabilities/ src-tauri/tauri.conf.json
git commit -m "chore: 配置 Tauri 权限"
```

---

### Task 20: 最终测试与发布准备

**Step 1: 功能测试清单**

手动测试以下功能：
- [ ] 拖拽打开文件
- [ ] Ctrl+O 打开文件对话框
- [ ] 文件索引构建
- [ ] 虚拟滚动加载大文件
- [ ] 关键词搜索
- [ ] 正则表达式搜索
- [ ] 大小写敏感开关
- [ ] 搜索结果导航（上一个/下一个）
- [ ] 行号跳转（Ctrl+G）
- [ ] 多标签页切换
- [ ] 关闭标签页

**Step 2: 性能测试**

```bash
# 生成一个大型测试日志文件
seq 1 1000000 | awk '{print "2024-01-01 12:00:00 INFO Line " $1 " - This is a sample log message for testing performance."}' > test.log
```

用应用打开 `test.log`，验证：
- 首次打开索引构建时间 < 10秒
- 滚动流畅无卡顿
- 搜索响应时间 < 1秒
- 内存占用稳定

**Step 3: 最终 Commit**

```bash
git add .
git commit -m "chore: 完成功能测试与验证"
```

---

## 完成检查清单

- [ ] Tauri 项目初始化完成
- [ ] 前端工具链配置完成
- [ ] Rust 后端依赖配置完成
- [ ] 文件索引数据结构实现
- [ ] SQLite 存储层实现
- [ ] 文件加载器实现
- [ ] ripgrep 搜索引擎实现
- [ ] Tauri IPC 命令实现
- [ ] 前端类型定义
- [ ] Tauri API 封装
- [ ] Zustand 状态管理
- [ ] LogViewer 核心组件
- [ ] 搜索栏组件
- [ ] 标签栏组件
- [ ] 状态栏组件
- [ ] 文件打开功能
- [ ] 主应用组装
- [ ] 跳转功能
- [ ] Tauri 权限配置
- [ ] 功能测试通过
