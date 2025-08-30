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

  // Check for existing token on mount
  useEffect(() => {
    if (initialized) return; // Prevent multiple runs
    
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        console.log('Initial auth check, token found:', !!token); // Debug log
        if (token) {
          setAuthToken(token);
          const userData = await getCurrentUser();
          console.log('Initial auth successful:', userData.email); // Debug log
          setUser(userData);
        }
      } catch (error) {
        console.error('Initial auth check failed:', error);
        localStorage.removeItem('auth_token');
        clearAuthToken();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    checkAuth();
  }, [initialized]);

  // Listen for auth expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  // Handle OAuth callback - both code and token parameters
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const token = urlParams.get('token');
      const error = urlParams.get('error');
      
      // Skip if no OAuth parameters or already initialized
      if (!code && !token && !error) return;
      
      if (error) {
        setError('Authentication failed. Please try again.');
        window.history.replaceState({}, document.title, '/');
        return;
      }
      
      if (token) {
        // Handle direct token from backend redirect
        setLoading(true);
        try {
          console.log('Setting token from URL:', token.substring(0, 20) + '...'); // Debug log
          localStorage.setItem('auth_token', token);
          setAuthToken(token);
          
          console.log('Fetching user data...'); // Debug log
          const userData = await getCurrentUser();
          console.log('User data received:', userData); // Debug log
          setUser(userData);
          setInitialized(true);
          
          // Clean up URL and redirect to main page
          window.history.replaceState({}, document.title, '/');
        } catch (error) {
          console.error('Token authentication failed:', error);
          setError('Authentication failed. Please try again.');
          localStorage.removeItem('auth_token');
          clearAuthToken();
        } finally {
          setLoading(false);
        }
      } else if (code) {
        // Handle authorization code exchange (original flow)
        setLoading(true);
        try {
          const tokenData = await exchangeCodeForToken(code);
          const jwtToken = tokenData.access_token;
          
          localStorage.setItem('auth_token', jwtToken);
          setAuthToken(jwtToken);
          
          const userData = await getCurrentUser();
          setUser(userData);
          setInitialized(true);
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('OAuth callback failed:', error);
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
      console.error('Login failed:', error);
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