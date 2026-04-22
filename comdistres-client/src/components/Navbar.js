import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Bell, Menu, X, Sun, Moon, LogOut, Home, ChevronDown } from 'lucide-react';
import api from '../api/axios';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Fetch unread notifications
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get(`/notifications/user/${user.id}`);
        const unread = res.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [user]);

  // Theme toggle
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch(user.role) {
      case 1: return '/admin';
      case 2: return '/coordinator';
      case 3: return '/volunteer';
      case 4: return '/citizen';
      default: return '/overview';
    }
  };

  const getRoleName = () => {
    if (!user) return '';
    const roles = { 1: 'Admin', 2: 'Coordinator', 3: 'Volunteer', 4: 'Citizen' };
    return roles[user.role] || 'User';
  };

  const getRoleColor = () => {
    const colors = {
      1: 'text-purple-600 bg-purple-50 border border-purple-200',
      2: 'text-blue-600 bg-blue-50 border border-blue-200',
      3: 'text-green-600 bg-green-50 border border-green-200',
      4: 'text-gray-600 bg-gray-50 border border-gray-200',
    };
    return colors[user?.role] || colors[4];
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link 
            to={getDashboardLink()} 
            className="font-bold text-xl text-blue-600 hover:text-blue-700 transition flex items-center gap-2"
          >
            🚨 <span className="hidden sm:inline">Community Disaster Response</span>
            <span className="sm:hidden">CDRS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              to="/overview" 
              className={`text-sm font-medium transition ${
                isActive('/overview') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Overview
            </Link>
            <Link 
              to="/resources" 
              className={`text-sm font-medium transition ${
                isActive('/resources') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Resources
            </Link>
            <Link 
              to="/contact" 
              className={`text-sm font-medium transition ${
                isActive('/contact') 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Contact
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>

            {user && (
              <>
                {/* Dashboard Link */}
                <Link
                  to={getDashboardLink()}
                  className={`hidden md:block text-sm font-medium transition ${
                    isActive(getDashboardLink()) 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Dashboard
                </Link>

                {/* Reports Link */}
                <Link
                  to="/reports"
                  className={`hidden md:block text-sm font-medium transition ${
                    isActive('/reports') 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Reports
                </Link>

                {/* Map Link */}
                <Link 
                  to="/map" 
                  className={`hidden md:block text-sm font-medium transition ${
                    isActive('/map') 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Map
                </Link>

                {/* Chat Link */}
                <Link
                  to="/chat"
                  className={`hidden md:block text-sm font-medium transition ${
                    isActive('/chat') 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Chat
                </Link>

                {/* Notifications Bell */}
                <Link to="/notifications" className="relative">
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition">
                    <Bell className="w-5 h-5 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition border border-gray-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                      <div className={`text-xs px-2 py-0.5 rounded ${getRoleColor()}`}>
                        {getRoleName()}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setUserMenuOpen(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-20 py-2">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-bold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <Link
                          to={getDashboardLink()}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <Home className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link
                          to="/notifications"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <Bell className="w-4 h-4" />
                          Notifications
                        </Link>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            )}

            {/* Auth Buttons for Non-logged Users */}
            {!user && (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && user && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            <Link
              to="/overview"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
            >
              Overview
            </Link>
            <Link
              to={getDashboardLink()}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
            >
              Dashboard
            </Link>
            <Link
              to="/reports"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
            >
              Reports
            </Link>
            <Link
              to="/map"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
            >
              Map
            </Link>
            <Link
              to="/chat"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
            >
              Chat
            </Link>
            <Link
              to="/resources"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
            >
              Resources
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded"
            >
              Contact
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}