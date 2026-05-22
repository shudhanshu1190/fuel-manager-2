import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SalesEntry from './pages/SalesEntry.jsx';
import CounterManagement from './pages/CounterManagement.jsx';
import CreditLedger from './pages/CreditLedger.jsx';
import Reports from './pages/Reports.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import { Menu, Calendar, Clock, Sparkles } from 'lucide-react';

const AppContent = () => {
  const { isAuthenticated, user } = useAuth();
  const { isDark } = useTheme();
  
  // Navigation active page
  const [activePage, setActivePage] = useState('dashboard');
  
  // Mobile sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Live clock
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isAuthenticated) {
    return <Login />;
  }

  // Render correct page view
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'sales':
        return <SalesEntry />;
      case 'counter':
        return <CounterManagement />;
      case 'credit':
        return <CreditLedger />;
      case 'reports':
        return <Reports />;
      case 'audit':
        return <AuditLogs />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-darkBg text-slate-100' : 'bg-lightBg text-slate-800'}`}>
      {/* Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {/* Main Panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className={`flex h-16 items-center justify-between border-b px-6 ${
          isDark ? 'bg-darkCard border-darkBorder' : 'bg-lightCard border-lightBorder'
        }`}>
          {/* Hamburger toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 lg:hidden hover:bg-slate-500/5 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Quick Stats banner */}
          <div className="hidden items-center space-x-1.5 text-xs text-slate-400 font-medium sm:flex">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <span>Operational Console</span>
            <span className="text-[10px] bg-slate-500/5 px-1.5 py-0.5 rounded font-normal text-slate-500">
              v1.0.0 Stable
            </span>
          </div>

          {/* Clock and User details */}
          <div className="flex items-center space-x-4">
            {/* Clock */}
            <div className="flex items-center space-x-2 text-right">
              <div className="hidden flex-col items-end leading-tight xs:flex">
                <span className="text-xs font-semibold text-slate-400">
                  {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className="font-mono text-sm font-extrabold text-orange-500">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <Clock className="h-5 w-5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Dynamic page contents scrollable */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
