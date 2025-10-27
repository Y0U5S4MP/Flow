import React from 'react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Palette, Upload, User, LogOut, Code } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const navItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/gallery', icon: BookOpen, label: 'Galería' },
    { path: '/code', icon: Code, label: 'Code Editor' },
  ];

  // Add upload link only for creators
  if (user?.role === 'creator') {
    navItems.push({ path: '/upload', icon: Upload, label: 'Subir' });
  }
  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg group-hover:scale-105 transition-transform">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Frameflow
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    location.pathname === path
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{label}</span>
                </Link>
              ))}
              
              {/* Auth Section */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-purple-50 rounded-lg">
                    <User className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">
                      {user?.username}
                    </span>
                    <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full capitalize">
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Salir</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>

            {/* Mobile Menu */}
            <div className="md:hidden">
              <div className="flex items-center space-x-4">
                {navItems.map(({ path, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      location.pathname === path
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:text-purple-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                ))}
                
                {isAuthenticated ? (
                  <button
                    onClick={logout}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="p-2 bg-purple-600 text-white rounded-lg"
                  >
                    <User className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

export default Navbar;