import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [activeShift, setActiveShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  // Fetch active shift when user is logged in
  const fetchActiveShift = async () => {
    if (!user) return;
    setShiftLoading(true);
    try {
      const data = await api.get('/shift/active');
      if (data.active) {
        setActiveShift(data);
      } else {
        setActiveShift(null);
      }
    } catch (error) {
      console.error('Error fetching active shift:', error.message);
    } finally {
      setShiftLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchActiveShift();
    } else {
      setActiveShift(null);
    }
  }, [user]);

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveShift(null);
  };

  const handleOpenShift = async (startCash, remarks) => {
    const data = await api.post('/shift/open', { startCash, remarks });
    await fetchActiveShift();
    return data;
  };

  const handleCloseShift = async (endCash, remarks) => {
    const data = await api.post('/shift/close', { endCash, remarks });
    await fetchActiveShift();
    return data;
  };

  const handleReopenShift = async (shiftId) => {
    const data = await api.post(`/shift/${shiftId}/reopen`);
    await fetchActiveShift();
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeShift,
        shiftLoading,
        login,
        logout,
        fetchActiveShift,
        openShift: handleOpenShift,
        closeShift: handleCloseShift,
        reopenShift: handleReopenShift,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
