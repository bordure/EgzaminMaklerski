// src/pages/AuthCallback.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // AuthContext will handle token automatically from URL
    // After token is processed, navigate to main page
    const timer = setTimeout(() => {
      navigate('/generate', { replace: true });
    }, 500); // give AuthContext a moment to set token

    return () => clearTimeout(timer);
  }, [navigate]);

  return <p>Signing you in...</p>;
}
