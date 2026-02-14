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
    if (!activeFile || !searchOptions.pattern || !activeFileId) return;

    setIsSearching(true);
    try {
      const matches = await search(activeFile.path, {
        pattern: searchOptions.pattern,
        caseSensitive: searchOptions.caseSensitive,
        regexMode: searchOptions.regexMode,
        wholeWord: searchOptions.wholeWord,
      });

      setSearchResults(activeFileId, {
        fileId: activeFileId,
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
    if (!currentSearchResult || currentSearchResult.matches.length === 0 || !activeFileId) return;
    const newIndex =
      (currentSearchResult.currentMatchIndex - 1 + currentSearchResult.matches.length) %
      currentSearchResult.matches.length;
    setCurrentMatchIndex(activeFileId, newIndex);
    setScrollToLine(currentSearchResult.matches[newIndex].lineNumber);
  };

  const handleNextMatch = () => {
    if (!currentSearchResult || currentSearchResult.matches.length === 0 || !activeFileId) return;
    const newIndex =
      (currentSearchResult.currentMatchIndex + 1) % currentSearchResult.matches.length;
    setCurrentMatchIndex(activeFileId, newIndex);
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
            ^
          </button>
          <button
            onClick={handleNextMatch}
            disabled={currentSearchResult.matches.length === 0}
            className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600
                       disabled:opacity-50"
          >
            v
          </button>
        </div>
      )}
    </div>
  );
}
