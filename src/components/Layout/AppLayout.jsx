import { useUIStore } from '../../stores/uiStore';
import Sidebar from './Sidebar';

function AppLayout({ children }) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
