import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'whereabouts_token';

function parseToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function readStoredUser() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const payload = parseToken(token);
  if (!payload) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return { username: payload.username, userId: payload.userId };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('login');

  const login = (token) => {
    const payload = parseToken(token);
    if (!payload) return;
    localStorage.setItem(TOKEN_KEY, token);
    setUser({ username: payload.username, userId: payload.userId });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const openAuth = (tab = 'login') => {
    setModalTab(tab);
    setModalOpen(true);
  };

  const closeAuth = () => setModalOpen(false);

  return (
    <AuthContext.Provider value={{ user, login, logout, getToken, modalOpen, modalTab, openAuth, closeAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
