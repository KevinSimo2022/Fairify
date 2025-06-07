
import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // Show loading screen while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-maphera-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maphera-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Maphera...</p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-maphera-bg">
      <Navbar />
      <div className="flex">
        {user && <Sidebar />}
        <main className={`flex-1 ${user ? 'ml-64' : ''} transition-all duration-300`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
