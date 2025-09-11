import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { BookOpen, LogOut } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return null;
  }

  const isActive = (path) => location.pathname === path;

  const donateButtonClasses = `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors 
    text-gray-600 hover:text-gray-900 hover:bg-gray-100`;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <Link to="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              Egzamin Maklerski
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/generate"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/generate')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Generate Exam
            </Link>
            <Link
              to="/topics"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/topics')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Browse Topics
            </Link>

            {/* Donate Button */}
            <a
              href="https://buycoffee.to/egzaminmaklerski"
              target="_blank"
              rel="noopener noreferrer"
              className={donateButtonClasses}
              title="Support us with a coffee!"
            >
              <img 
                src="https://www.svgrepo.com/show/330105/buymeacoffee.svg" 
                alt="Buy Me a Coffee"
                className="w-5 h-5"
              />
              <span className="hidden lg:inline">Donate</span>
            </a>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={user?.picture}
                alt={user?.name}
                className="w-8 h-8 rounded-full border-2 border-gray-200"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4 pt-2">
          <div className="flex space-x-4 flex-wrap gap-y-2">
            <Link
              to="/generate"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/generate')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Generate Exam
            </Link>
            <Link
              to="/topics"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/topics')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Browse Topics
            </Link>

            {/* Mobile Donate Button */}
            <a
              href="https://buycoffee.to/egzaminmaklerski"
              target="_blank"
              rel="noopener noreferrer"
              className={donateButtonClasses}
              title="Support us with a coffee!"
            >
              <img 
                src="https://www.svgrepo.com/show/330105/buymeacoffee.svg" 
                alt="Buy Me a Coffee"
                className="w-5 h-5"
              />
              Donate
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
