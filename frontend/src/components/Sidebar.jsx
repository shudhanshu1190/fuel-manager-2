import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  LayoutDashboard,
  Fuel,
  Coins,
  BookOpen,
  BarChart3,
  History,
  Users,
  LogOut,
  Moon,
  Sun,
  X,
  Lock,
  Unlock,
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar, activePage, setActivePage }) => {
  const { user, activeShift, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      hindi: 'डैशबोर्ड',
      icon: LayoutDashboard,
      roles: ['Owner', 'Manager', 'Salesman', 'Counter Operator'],
    },
    {
      id: 'sales',
      label: 'Sales Entry',
      hindi: 'बिक्री प्रविष्टि',
      icon: Fuel,
      roles: ['Owner', 'Manager', 'Salesman'],
    },
    {
      id: 'counter',
      label: 'Counter Cash',
      hindi: 'नकद काउंटर',
      icon: Coins,
      roles: ['Owner', 'Manager', 'Counter Operator'],
    },
    {
      id: 'credit',
      label: 'Credit Ledger',
      hindi: 'उधार खाता',
      icon: BookOpen,
      roles: ['Owner', 'Manager', 'Salesman', 'Counter Operator'],
    },
    {
      id: 'reports',
      label: 'Daily Reports',
      hindi: 'दैनिक रिपोर्ट',
      icon: BarChart3,
      roles: ['Owner', 'Manager'],
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      hindi: 'ऑडिट लॉग',
      icon: History,
      roles: ['Owner', 'Manager'],
    },
  ];

  const allowedItems = menuItems.filter((item) => item.roles.includes(user?.role));

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-darkCard border-darkBorder text-slate-200'
            : 'bg-lightCard border-lightBorder text-slate-700'
        }`}
      >
        <div>
          {/* Header / Brand */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-inherit">
            <div className="flex items-center space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 font-bold text-white shadow-lg shadow-orange-600/30">
                FL
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                FuelLedger
              </span>
            </div>
            <button className="rounded-lg p-1.5 lg:hidden hover:bg-slate-800/10 dark:hover:bg-slate-200/10" onClick={toggleSidebar}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Badge */}
          <div className="p-5 border-b border-inherit">
            <div className="flex items-center space-x-3 rounded-xl p-3 bg-slate-500/5 border border-slate-500/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-600 font-bold text-white uppercase">
                {user?.name ? user.name[0] : 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="truncate text-sm font-semibold">{user?.name}</h4>
                <p className="text-xs text-slate-500 capitalize">{user?.role} (यूजर)</p>
              </div>
            </div>

            {/* Active Shift Indicator */}
            <div className="mt-3">
              {activeShift ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-500 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <Unlock className="h-3.5 w-3.5 animate-pulse-subtle" />
                    <span>Shift #{activeShift.shift.shiftNumber} Open</span>
                  </div>
                  <span className="opacity-85 font-normal">चल रहा है</span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-500 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Shift Closed (लॉक्ड)</span>
                  </div>
                  <span className="opacity-85 font-normal">बंद है</span>
                </div>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <nav className="mt-4 space-y-1 px-4">
            {allowedItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePage(item.id);
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/10'
                      : 'hover:bg-slate-500/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex flex-col items-start leading-none">
                    <span>{item.label}</span>
                    <span className={`text-[10px] font-normal ${isActive ? 'text-orange-100' : 'text-slate-500'}`}>
                      {item.hindi}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-inherit space-y-2">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-500/5"
          >
            <div className="flex items-center space-x-3">
              {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-500" />}
              <span className="flex flex-col items-start text-xs">
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {isDark ? 'लाइट थीम' : 'डार्क थीम'}
                </span>
              </span>
            </div>
            <div className={`h-5 w-9 rounded-full p-0.5 transition-colors duration-200 ${isDark ? 'bg-orange-500' : 'bg-slate-300'}`}>
              <div className={`h-4 w-4 rounded-full bg-white transition-transform duration-200 ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <div className="flex flex-col items-start text-xs">
              <span>Log Out</span>
              <span className="text-[10px] text-rose-400/80 font-normal">लॉग आउट</span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
