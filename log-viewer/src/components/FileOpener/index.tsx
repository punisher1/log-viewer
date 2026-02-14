import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useFileOpener } from '../../hooks/useFileOpener';

interface Props {
  children: React.ReactNode;
}

export function FileOpener({ children }: Props) {
  const { openSingleFile, showOpenDialog } = useFileOpener();

  // 监听文件拖放
  useEffect(() => {
    const unlisten = listen<string[]>('tauri://drag-drop', (event) => {
      const paths = event.payload;
      paths.forEach((path) => {
        openSingleFile(path);
      });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [openSingleFile]);

  // 监听快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        showOpenDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOpenDialog]);

  return <>{children}</>;
}
