import { useLogViewerStore } from '../../stores/logViewerStore';

export function TabBar() {
  const { openFiles, activeFileId, setActiveFile, closeFile } = useLogViewerStore();

  const files = Array.from(openFiles.values());

  if (files.length === 0) return null;

  return (
    <div className="flex bg-gray-800 border-b border-gray-700 overflow-x-auto">
      {files.map((file) => (
        <div
          key={file.id}
          className={`flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-gray-700
                     ${file.isActive ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          onClick={() => setActiveFile(file.id)}
        >
          <span className="truncate max-w-[200px]">{file.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeFile(file.id);
            }}
            className="ml-2 text-gray-500 hover:text-white"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
