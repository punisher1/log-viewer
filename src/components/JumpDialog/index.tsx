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
