import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../api/authApi';

const AuthContext = createContext(null);

const THEME_KEY = 'amarSchoolTheme';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Global dark mode ───────────────────────────────────
  const [isDark, setIsDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark');

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((prev) => !prev), []);

  // ─── Auth ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('amarSchoolToken');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getMe()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('amarSchoolToken');
      })
      .finally(() => setLoading(false));
  }, []);

  const loginUser = async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('amarSchoolToken', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logoutUser = () => {
    localStorage.removeItem('amarSchoolToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginUser, logoutUser, isDark, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
