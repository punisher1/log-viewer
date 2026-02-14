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
