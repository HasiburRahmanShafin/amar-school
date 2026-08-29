import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';

export default function TeacherLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isDark } = useAuth();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-blue-50'}`}>
      <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <Sidebar open={sidebarOpen} />

      <main
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{
          paddingTop: 'var(--header-height)',
          marginLeft: sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed)',
        }}
      >
        <div className="flex-1 p-6 animate-fade-up">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
