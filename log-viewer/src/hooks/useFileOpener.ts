import { useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useLogViewerStore } from '../stores/logViewerStore';
import { openFile, buildIndex, getIndexStatus } from '../api/tauri';
import type { FileTab } from '../types';

export function useFileOpener() {
  const { openFile: openFileTab, setLoading } = useLogViewerStore();

  const openSingleFile = useCallback(async (path: string) => {
    setLoading(true, '正在打开文件...');

    try {
      const meta = await openFile(path);

      // 检查索引状态
      const status = await getIndexStatus(path);

      // 如果未索引，构建索引
      if (!status.indexed) {
        setLoading(true, '正在构建索引...');
        await buildIndex(path);
      }

      const tab: FileTab = {
        id: path,
        path: meta.path,
        name: meta.name,
        totalLines: status.indexed ? status.totalLines : 0,
        isIndexed: status.indexed,
        isActive: true,
      };

      openFileTab(tab);
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [openFileTab, setLoading]);

  const showOpenDialog = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Log Files', extensions: ['log', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (selected) {
      await openSingleFile(selected as string);
    }
  }, [openSingleFile]);

  return { openSingleFile, showOpenDialog };
}
