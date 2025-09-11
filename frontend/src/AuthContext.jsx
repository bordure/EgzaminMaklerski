import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken, clearAuthToken, getCurrentUser, exchangeCodeForToken, getGoogleAuthUrl } from './api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return; 
    
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          setAuthToken(token);
          const userData = await getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        localStorage.removeItem('auth_token');
        clearAuthToken();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    checkAuth();
  }, [initialized]);

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const token = urlParams.get('token');
      const error = urlParams.get('error');
      
      if (!code && !token && !error) return;
      
      if (error) {
        setError('Authentication failed. Please try again.');
        window.history.replaceState({}, document.title, '/');
        return;
      }
      
      if (token) {
        setLoading(true);
        try {
          localStorage.setItem('auth_token', token);
          setAuthToken(token);
          const userData = await getCurrentUser();
          setUser(userData);
          setInitialized(true);
          
          window.history.replaceState({}, document.title, '/');
        } catch (error) {
          setError('Authentication failed. Please try again.');
          localStorage.removeItem('auth_token');
          clearAuthToken();
        } finally {
          setLoading(false);
        }
      } else if (code) {
        setLoading(true);
        try {
          const tokenData = await exchangeCodeForToken(code);
          const jwtToken = tokenData.access_token;
          
          localStorage.setItem('auth_token', jwtToken);
          setAuthToken(jwtToken);
          
          const userData = await getCurrentUser();
          setUser(userData);
          setInitialized(true);
          
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          setError('Authentication failed. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const login = async () => {
    try {
      setError(null);
      const { auth_url } = await getGoogleAuthUrl();
      window.location.href = auth_url;
    } catch (error) {
      setError('Failed to initiate login. Please try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    clearAuthToken();
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};