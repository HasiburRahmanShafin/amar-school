import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/* ── SVG Icons ─────────────────────────────────────────── */
const Icon = ({ children, className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={`w-5 h-5 flex-shrink-0 ${className}`}
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const icons = {
  dashboard:   <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
  students:    <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  teachers:    <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  website:     <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>,
  gallery:     <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
  notices:     <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>,
  routine:     <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  admission:   <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></>,
  applicants:  <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></>,
  profile:     <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  schools:     <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
};

const NAV_ITEMS = {
  school_admin: [
    { label: 'Dashboard',       to: '/admin/dashboard',                 icon: 'dashboard'  },
    { label: 'Students',        to: '/admin/students',                  icon: 'students'   },
    { label: 'Teachers',        to: '/admin/teachers',                  icon: 'teachers'   },
    { label: 'Notices',         to: '/admin/notices',                   icon: 'notices'    },
    { label: 'Class Routines',  to: '/admin/routines',                  icon: 'routine'    },
    { label: 'Admission',       to: '/admin/admissions/circulars',      icon: 'admission'  },
    { label: 'Applicants',      to: '/admin/admissions/applicants',     icon: 'applicants' },
    { label: 'Photo Gallery',   to: '/admin/gallery',                   icon: 'gallery'    },
    { label: 'Website Builder', to: '/admin/website-builder',           icon: 'website'    },
  ],
  teacher: [
    { label: 'Dashboard', to: '/teacher/dashboard', icon: 'dashboard' },
    { label: 'My Profile', to: '/teacher/profile',  icon: 'profile'   },
  ],
  super_admin: [
    { label: 'Schools', to: '/superadmin/schools', icon: 'schools' },
  ],
};

export default function Sidebar({ open }) {
  const { user, isDark } = useAuth();
  const items = NAV_ITEMS[user?.role] || [];

  const sidebarBase = isDark
    ? 'bg-slate-900 border-slate-700/60 text-slate-300'
    : 'bg-white border-slate-200/80 text-slate-600';

  const activeClass = isDark
    ? 'bg-indigo-900/40 text-indigo-300 sidebar-item-active'
    : 'bg-indigo-50 text-indigo-700 sidebar-item-active';

  const inactiveClass = isDark
    ? 'hover:bg-slate-800 hover:text-slate-100'
    : 'hover:bg-slate-50 hover:text-slate-800';

  const sectionLabel = isDark ? 'text-slate-600' : 'text-slate-400';

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-30 flex flex-col border-r transition-all duration-300 ease-in-out ${sidebarBase}`}
        style={{
          width: open ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed)',
          top: 'var(--header-height)',
          height: 'calc(100vh - var(--header-height))',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {/* Section header */}
          {open && (
            <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 pb-2 pt-1 sidebar-label ${sectionLabel}`}>
              Navigation
            </p>
          )}

          {items.map(({ label, to, icon }) => (
            <NavLink
              key={to}
              to={to}
              id={`sidebar-${icon}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
                ${isActive ? activeClass : inactiveClass}`
              }
              title={!open ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon className={isActive
                    ? isDark ? 'text-indigo-400' : 'text-indigo-600'
                    : ''}>
                    {icons[icon]}
                  </Icon>
                  {open && (
                    <span className="truncate sidebar-label">{label}</span>
                  )}
                  {/* Active dot indicator when collapsed */}
                  {!open && isActive && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer — role badge */}
        <div className={`p-3 border-t ${isDark ? 'border-slate-700/60' : 'border-slate-100'}`}>
          {open ? (
            <div className="sidebar-label">
              <p className={`text-[10px] uppercase tracking-widest font-semibold mb-1 ${sectionLabel}`}>
                Signed in as
              </p>
              <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {user?.name}
              </p>
              <p className={`text-[10px] truncate ${sectionLabel}`}>
                {user?.school?.name || user?.role?.replace('_', ' ')}
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
