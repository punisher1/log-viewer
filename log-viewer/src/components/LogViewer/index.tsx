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
    if (!activeFile || !editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const scrollTop = e.scrollTop;
    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
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
