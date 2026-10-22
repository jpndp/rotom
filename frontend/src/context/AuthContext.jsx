import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('rotom_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.login({ email, password });
    localStorage.setItem('rotom_token', data.token);
    setUser(data.user);
  }

  async function signup(name, email, password) {
    const data = await api.signup({ name, email, password });
    localStorage.setItem('rotom_token', data.token);
    setUser(data.user);
  }

    function logout() {
    localStorage.removeItem('rotom_token');
    setUser(null);
  }

  async function refreshUser() {
    const data = await api.me();
    setUser(data.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}