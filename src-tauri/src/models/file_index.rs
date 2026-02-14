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
