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
  size: number;
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
