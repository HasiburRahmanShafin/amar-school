import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api as notificationApi } from '../../api/NotificationApi';

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

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = useCallback(() => {
    if (!user) return;
    notificationApi
      .get('/notifications')
      .then((res) => {
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      })
      .catch(() => {});
  }, [user]);

  // Poll every 60s so a new alert (e.g. an attendance notification) shows
  // up on the bell without the user needing to refresh the page.
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
    setNotifOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      notificationApi.patch(`/notifications/${notification._id}/read`).catch(() => {});
    }
    setNotifOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    notificationApi.patch('/notifications/read-all').catch(() => {});
  };

  const timeAgo = (dateStr) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const roleLabel = {
    super_admin: 'Super Admin',
    school_admin: 'School Admin',
    teacher: 'Teacher',
    parent: 'Parent',
    student: 'Student',
  }[user?.role] || 'User';

  const roleColor = {
    super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    school_admin: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    teacher: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    parent: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    student: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
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
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleToggleNotifications}
            className={`p-2 rounded-lg transition-colors duration-200 relative
              ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
            aria-label="Notifications"
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className={`absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl shadow-lg border z-50
                ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs font-medium text-indigo-500 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className={`px-4 py-6 text-sm text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  No notifications yet.
                </p>
              ) : (
                <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {notifications.map((n) => (
                    <button
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 transition-colors duration-150
                        ${n.read ? '' : (isDark ? 'bg-indigo-950/40' : 'bg-indigo-50/60')}
                        ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                        <div className={n.read ? 'ml-3.5' : ''}>
                          <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{n.title}</p>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{n.message}</p>
                          <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
