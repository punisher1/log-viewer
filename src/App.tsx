import { FileOpener } from './components/FileOpener';
import { TabBar } from './components/TabBar';
import { SearchBar } from './components/SearchBar';
import { LogViewer } from './components/LogViewer';
import { StatusBar } from './components/StatusBar';
import { JumpDialog } from './components/JumpDialog';

function App() {
  return (
    <FileOpener>
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        <TabBar />
        <SearchBar />
        <LogViewer />
        <StatusBar />
        <JumpDialog />
      </div>
    </FileOpener>
  );
}

export default App;
