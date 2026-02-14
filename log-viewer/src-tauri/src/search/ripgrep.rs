use grep::regex::RegexMatcher;
use grep::searcher::{Searcher, Sink, SinkMatch};
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

struct MatchCollector {
    results: Vec<MatchResult>,
}

impl MatchCollector {
    fn new() -> Self {
        Self { results: Vec::new() }
    }
}

impl Sink for MatchCollector {
    type Error = std::io::Error;

    fn matched(&mut self, _searcher: &Searcher, mat: &SinkMatch<'_>) -> Result<bool, Self::Error> {
        let line_bytes = mat.bytes();
        let line_str = String::from_utf8_lossy(line_bytes).to_string();

        // 获取匹配在行内的字节偏移
        // SinkMatch 提供了 bytes() 返回整个匹配行
        // 我们需要找到匹配文本在行中的位置
        // 由于 mat.absolute_byte_offset() 返回文件中的绝对偏移，
        // 我们暂时使用 0 作为列起始位置
        let mat_start = 0u32;
        let mat_end = line_bytes.len() as u32;

        // 获取行号
        let line_number = mat.line_number().unwrap_or(0);

        self.results.push(MatchResult {
            line_number,
            column_start: mat_start,
            column_end: mat_end,
            line_content: line_str.trim_end().to_string(),
        });

        Ok(true)
    }
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
        let mut collector = MatchCollector::new();

        searcher.search_path(&matcher, path, &mut collector)?;

        Ok(collector.results)
    }
}
