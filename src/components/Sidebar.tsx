
import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Upload,
  Map,
  BarChart3,
  FileText,
  Settings,
  Shield
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Upload Data', href: '/upload', icon: Upload },
    { name: 'Map View', href: '/map', icon: Map },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'My Results', href: '/results', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navigation.push({ name: 'Admin Panel', href: '/admin', icon: Shield });
  }

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white shadow-lg border-r border-gray-200 overflow-y-auto">
      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                  isActive
                    ? 'bg-maphera-blue text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
