import React, { createContext, useContext, useState, useEffect } from "react";
import {
  setAuthToken,
  clearAuthToken,
  getCurrentUser,
  getGoogleAuthUrl,
  guestLogin,
} from "./api";
import axios from "axios";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const refreshAccessToken = async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) throw new Error("No refresh token available");

      const res = await axios.post(
        "/auth/refresh",
        {},
        { headers: { Authorization: `Bearer ${refresh}` } }
      );

      const { access_token, refresh_token } = res.data;
      localStorage.setItem("auth_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      setAuthToken(access_token);
      return access_token;
    } catch (err) {
      console.error("Refresh token failed", err);
      logout();
      throw err;
    }
  };

  useEffect(() => {
    if (initialized) return;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const refresh = localStorage.getItem("refresh_token");

        if (token) {
          setAuthToken(token);
          const userData = await getCurrentUser();
          setUser(userData);
        } else if (refresh) {
          const newToken = await refreshAccessToken();
          setAuthToken(newToken);
          const userData = await getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.warn("Auth check failed:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        clearAuthToken();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    checkAuth();
  }, [initialized]);

  useEffect(() => {
    const handleAuthExpired = () => logout();
    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, []);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      const refresh = urlParams.get("refresh");
      const error = urlParams.get("error");

      if (!token && !refresh && !error) return;

      if (error) {
        setError("Authentication failed. Please try again.");
        window.history.replaceState({}, document.title, "/");
        return;
      }

      if (token && refresh) {
        try {
          localStorage.setItem("auth_token", token);
          localStorage.setItem("refresh_token", refresh);
          setAuthToken(token);

          const userData = await getCurrentUser();
          setUser(userData);
          setInitialized(true);
        } catch (err) {
          console.error("OAuth callback error:", err);
          setError("Authentication failed. Please try again.");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          clearAuthToken();
        } finally {
          setLoading(false);
          window.history.replaceState({}, document.title, "/");
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const login = async (mode = "google") => {
    try {
      setError(null);
      if (mode === "guest") {
        const res = await guestLogin();
        localStorage.setItem("auth_token", res.access_token);
        localStorage.setItem("refresh_token", res.refresh_token);
        setAuthToken(res.access_token);
        setUser({ name: "Guest", email: null, picture: null, guest: true });
      } else {
        const { auth_url } = await getGoogleAuthUrl();
        window.location.href = auth_url;
      }
    } catch (error) {
      console.error(error);
      setError("Failed to initiate login. Please try again.");
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
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
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
