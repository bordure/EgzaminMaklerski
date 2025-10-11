import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { BookOpen, LogOut, LogIn, FileText, Sun, Moon, Menu, X } from 'lucide-react';
import { useDarkMode } from './DarkModeContext';
import guestAvatar from '../assets/images/guest-avatar.svg';
import coffeeIcon from '../assets/images/coffee-icon.svg';

const Navbar = () => {
  const { user, logout, isAuthenticated, login } = useAuth();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isAuthenticated) return null;

  const isActive = (path) => location.pathname === path;

  const linkClasses = (path) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
    }`;

  const DonateButton = () => (
    <a
      href="https://buycoffee.to/egzaminmaklerski"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
      title="Support us with a coffee!"
    >
      <img
        src={coffeeIcon}
        alt="Buy Me a Coffee"
        className="w-5 h-5 transition dark:invert"
      />
      <span>Donate</span>
    </a>
  );

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <Link
              to="/"
              className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 transition-colors"
            >
              Egzamin Maklerski
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/generate" className={linkClasses('/generate')}>
              Generate Exam
            </Link>
            <Link to="/topics" className={linkClasses('/topics')}>
              Browse Topics
            </Link>
            <Link to="/notes" className={linkClasses('/notes')}>
              <FileText className="w-4 h-4 mr-1 inline" />
              Notes
            </Link>
            <DonateButton />
          </div>

          {/* User actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDarkMode ? 'Light' : 'Dark'}
            </button>

            {/* Avatar + info */}
            <div className="flex items-center gap-3">
              <img
                src={
                  user?.guest
                    ? guestAvatar
                    : user?.picture
                }
                alt={user?.name || 'Guest'}
                className={`w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600 object-cover ${
                  user?.guest ? 'dark:invert' : ''
                }`}
              />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user?.guest ? 'Guest' : user?.name}
                </p>
                {!user?.guest && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                )}
              </div>
            </div>

            {/* Login or Logout button */}
            {user?.guest ? (
              <button
                onClick={login}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Login"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
            ) : (
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>

          {/* Mobile buttons */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              title="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu</span>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-2">
          <Link to="/generate" onClick={() => setMenuOpen(false)} className={linkClasses('/generate')}>
            Generate Exam
          </Link>
          <Link to="/topics" onClick={() => setMenuOpen(false)} className={linkClasses('/topics')}>
            Browse Topics
          </Link>
          <Link to="/notes" onClick={() => setMenuOpen(false)} className={linkClasses('/notes')}>
            <FileText className="w-4 h-4 mr-1 inline" />
            Notes
          </Link>
          <DonateButton />

          {user?.guest ? (
            <button
              onClick={() => {
                login();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          ) : (
            <button
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;