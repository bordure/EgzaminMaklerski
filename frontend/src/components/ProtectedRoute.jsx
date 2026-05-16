import React from 'react';
import { useAuth } from '../AuthContext';
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Ładowanie...</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">Łączenie z serwerem...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Serwer może potrzebować ~30 sekund na uruchomienie. Odśwież stronę za chwilę.</p>
        </div>
      </div>
    );
  }
  return children;
};
export default ProtectedRoute;