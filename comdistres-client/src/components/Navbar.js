import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const nav = useNavigate();

  const getDashboardLink = () => {
    if (!user) return '/';
    
    // Role-based dashboard routing
    switch(user.role) {
      case 1: // Administrator
        return '/admin';
      case 2: // Coordinator
        return '/coordinator';
      case 3: // Volunteer
        return '/volunteer';
      case 4: // Citizen
        return '/citizen';
      default:
        return '/overview';
    }
  };

  const getRoleName = () => {
    if (!user) return '';
    const roles = {
      1: 'Admin',
      2: 'Coordinator',
      3: 'Volunteer',
      4: 'Citizen'
    };
    return roles[user.role] || 'User';
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link 
            to={getDashboardLink()} 
            className="font-bold text-xl text-blue-600 hover:text-blue-700 transition"
          >
            🚨 Community Disaster Response
          </Link>
          <Link to="/overview" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
              Overview
            </Link>
            <Link to="/resources" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
              Resources
            </Link>
            <Link to="/contact" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
              Contact
            </Link>
          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {/* Dashboard Link - Role specific */}
            {user && (
              <Link
                to={getDashboardLink()}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
              >
                Dashboard
              </Link>
            )}

            {/* Reports Link */}
            <Link
              to="/reports"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
            >
              Reports
            </Link>
            {/* Map Link */}
            <Link to="/map" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                   Map
              </Link>
            {/* Chat Link */}
            <Link
              to="/chat"
              className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
            >
              Chat
            </Link>

            {/* User Section */}
            {user ? (
              <div className="flex items-center gap-4 border-l pl-4">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{getRoleName()}</div>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    nav('/login');
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                >
                  Logout
                </button>
              </div>
            ) : (
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
      </div>
    </nav>
  );
}