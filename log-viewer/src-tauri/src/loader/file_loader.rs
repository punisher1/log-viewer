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
