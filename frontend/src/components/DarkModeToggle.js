import { useState, useEffect } from 'react';

const STORAGE_KEY = 'studentModuleDarkMode';

// Shared hook — gives pages access to the dark mode state for styling
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isDark ? 'true' : 'false');
  }, [isDark]);

  const toggleDark = () => setIsDark((prev) => !prev);

  return [isDark, toggleDark];
}

// Polished sliding switch with animated sun/moon icons
export default function DarkModeToggle({ isDark, toggleDark }) {
  return (
    <button
      onClick={toggleDark}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      className={`relative inline-flex items-center h-9 w-16 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDark
          ? 'bg-gradient-to-r from-indigo-600 to-indigo-800 focus:ring-indigo-500 focus:ring-offset-gray-900'
          : 'bg-gradient-to-r from-sky-200 to-sky-300 focus:ring-blue-400 focus:ring-offset-white'
      }`}
    >
      {/* Background icons (dim, always visible) */}
      <span className="absolute left-1.5 flex items-center justify-center w-5 h-5">
        <svg viewBox="0 0 24 24" fill="none" className={`w-4 h-4 transition-opacity duration-300 ${isDark ? 'opacity-40' : 'opacity-0'}`}>
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.4 6.4l-.7-.7M6.3 6.3l-.7-.7m12.8 0l-.7.7M6.3 17.7l-.7.7M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="absolute right-1.5 flex items-center justify-center w-5 h-5">
        <svg viewBox="0 0 24 24" fill="none" className={`w-4 h-4 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-50'}`}>
          <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="#1e3a5f" />
        </svg>
      </span>

      {/* Sliding knob */}
      <span
        className={`inline-flex items-center justify-center h-7 w-7 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
          isDark ? 'translate-x-8' : 'translate-x-1'
        }`}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" fill="#4338ca" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <circle cx="12" cy="12" r="5" fill="#f59e0b" />
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.4 6.4l-.7-.7M6.3 6.3l-.7-.7m12.8 0l-.7.7M6.3 17.7l-.7.7" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  );
}
