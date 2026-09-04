import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function PublicHeader({ school }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Home',     id: 'hero' },
    { label: 'Notices',  id: 'notices' },
    { label: 'Gallery',  id: 'gallery' },
    { label: 'Routine',  id: 'routine' },
    { label: 'Contact',  id: 'contact' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo + Name */}
        <div className="flex items-center gap-3">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {school?.name?.[0] || 'S'}
            </div>
          )}
          <span className="font-bold text-slate-800 text-sm sm:text-base truncate max-w-[160px] sm:max-w-xs">
            {school?.name || 'School'}
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors duration-200"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {school?.subdomain && (
            <Link
              to={`/admission?subdomain=${school.subdomain}`}
              className="hidden sm:inline-flex text-xs font-semibold px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors duration-200"
            >
              Admission
            </Link>
          )}
          <Link
            to="/login"
            id="public-login-btn"
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            Staff Login
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="w-full text-left text-sm font-medium text-slate-600 hover:text-indigo-600 px-3 py-2.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              {label}
            </button>
          ))}
          {school?.subdomain && (
            <Link
              to={`/admission?subdomain=${school.subdomain}`}
              className="block text-sm font-medium text-indigo-700 px-3 py-2.5 rounded-lg hover:bg-indigo-50"
              onClick={() => setMenuOpen(false)}
            >
              Admission
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
