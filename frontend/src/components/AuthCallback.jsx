import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/generate', { replace: true });
    }, 500); // allow AuthContext time to set token

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-medium">Signing you in...</p>
      </div>
    </div>
  );
}
