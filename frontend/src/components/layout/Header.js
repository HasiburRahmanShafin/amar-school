import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
    <circle cx="12" cy="12" r="5" fill="#f59e0b" />
    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.4 6.4l-.7-.7M6.3 6.3l-.7-.7m12.8 0l-.7.7M6.3 17.7l-.7.7"
      stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="#6366f1" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const MenuIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {open
      ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
      : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
    }
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function Header({ sidebarOpen, onToggleSidebar }) {
  const { user, logoutUser, isDark, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const roleLabel = {
    super_admin: 'Super Admin',
    school_admin: 'School Admin',
    teacher: 'Teacher',
  }[user?.role] || 'User';

  const roleColor = {
    super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    school_admin: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    teacher: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  }[user?.role] || 'bg-gray-100 text-gray-600';

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 transition-all duration-300
        ${isDark
          ? 'bg-slate-900/95 border-b border-slate-700/60'
          : 'bg-white/95 border-b border-slate-200/80'}
        backdrop-blur-md`}
      style={{ height: 'var(--header-height)' }}
    >
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        id="header-sidebar-toggle"
        aria-label="Toggle sidebar"
        className={`p-2 rounded-lg transition-colors duration-200 flex-shrink-0
          ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
      >
        <MenuIcon open={sidebarOpen} />
      </button>

      {/* Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className={`font-bold text-base hidden sm:block ${isDark ? 'text-white' : 'text-slate-800'}`}>
          Amar School
        </span>
      </div>

      {/* School name (admin only) */}
      {user?.school?.name && (
        <span className={`text-sm hidden md:block truncate max-w-[200px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          · {user.school.name}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Notifications bell */}
        <button
          className={`p-2 rounded-lg transition-colors duration-200 relative
            ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
          aria-label="Notifications"
        >
          <BellIcon />
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          id="header-theme-toggle"
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
          className={`relative inline-flex items-center h-8 w-14 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            ${isDark
              ? 'bg-gradient-to-r from-indigo-700 to-purple-700 focus:ring-offset-slate-900'
              : 'bg-gradient-to-r from-sky-200 to-indigo-200 focus:ring-offset-white'}`}
        >
          <span className={`absolute left-1 transition-all duration-300 ${isDark ? 'opacity-30' : 'opacity-0'}`}>
            <SunIcon />
          </span>
          <span className={`absolute right-1 transition-all duration-300 ${isDark ? 'opacity-0' : 'opacity-50'}`}>
            <MoonIcon />
          </span>
          <span
            className={`inline-flex items-center justify-center h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-300
              ${isDark ? 'translate-x-7' : 'translate-x-1'}`}
          >
            {isDark ? <MoonIcon /> : <SunIcon />}
          </span>
        </button>

        {/* Divider */}
        <div className={`w-px h-6 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

        {/* User avatar + role */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className={`text-xs font-semibold leading-tight ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {user?.name}
            </p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleColor}`}>
              {roleLabel}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
            {initials}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          id="header-logout-btn"
          className={`p-2 rounded-lg transition-colors duration-200 flex-shrink-0
            ${isDark ? 'text-slate-400 hover:bg-red-950 hover:text-red-400' : 'text-slate-500 hover:bg-red-50 hover:text-red-600'}`}
          title="Logout"
          aria-label="Logout"
        >
          <LogoutIcon />
        </button>
      </div>
    </header>
  );
}
