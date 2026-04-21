// ==========================================
// UPDATED AuthContext.js
// ==========================================
import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current logged-in user on first load
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  // Login
  const login = async (email, password) => {
    try {
      // Send login request - this returns user data with role
      const loginRes = await api.post('/auth/login', { email, password });
      // Set user from login response
      setUser(loginRes.data);
      console.log('Login successful,user role: ', loginRes.data,)
      // Return user data for routing
      return loginRes.data;
    } catch (err) {
      console.error('Login failed:', err.response?.data);
      throw new Error(err.response?.data?.message || 'Login failed');
    }
  };

  // Signup
  const signup = async (name, email, password, role = 4, phone = null, address = null) => {
    try {
      const signupRes = await api.post('https://disaster-system-l3zu.onrender.com/api/auth/signup', { 
        name, 
        email, 
        password, 
        role,
        phone,
        address
      });

      // Set user from signup response
      setUser(signupRes.data);
      
      // Return user data for routing
      return signupRes.data;
    } catch (err) {
      console.error('Signup failed:', err.response?.data);
      throw new Error(err.response?.data?.message || 'Signup failed');
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null); // Clear user even if logout fails
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
