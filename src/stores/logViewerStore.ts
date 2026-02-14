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
