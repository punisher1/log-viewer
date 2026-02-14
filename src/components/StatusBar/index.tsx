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
