import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { DarkModeProvider } from "./components/DarkModeContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import GenerateExamPage from "./pages/GenerateExamPage";
import TopicsPage from "./pages/TopicsPage";
import AuthCallback from "./components/AuthCallback";
import Notes from './pages/Notes';

export default function App() {
  return (
    <AuthProvider>
      <DarkModeProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <Navbar />
            <Routes>
              <Route path="/" element={<Navigate to="/generate" replace />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route 
                path="/generate" 
                element={
                  <ProtectedRoute>
                    <GenerateExamPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notes" 
                element={
                  <ProtectedRoute>
                    <Notes />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/topics" 
                element={
                  <ProtectedRoute>
                    <TopicsPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </DarkModeProvider>
    </AuthProvider>
  );
}
