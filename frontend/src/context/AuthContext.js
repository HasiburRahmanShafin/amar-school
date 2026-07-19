import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load, if a token exists, try to restore the session
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
    <AuthContext.Provider value={{ user, setUser, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
