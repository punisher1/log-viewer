import { FileOpener } from './components/FileOpener';
import { TabBar } from './components/TabBar';
import { SearchBar } from './components/SearchBar';
import { LogViewer } from './components/LogViewer';
import { StatusBar } from './components/StatusBar';

function App() {
  return (
    <FileOpener>
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        <TabBar />
        <SearchBar />
        <LogViewer />
        <StatusBar />
      </div>
    </FileOpener>
  );
}

export default App;
