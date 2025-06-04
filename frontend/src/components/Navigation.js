import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, PieChart, Settings, LogOut, Shield, Users, User } from 'lucide-react';

const Navigation = ({ isAdmin, onLogout, currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      icon: MessageCircle,
      label: 'Chat',
      color: 'text-blue-400'
    },
    {
      path: '/portfolio',
      icon: PieChart,
      label: 'Portfolio',
      color: 'text-green-400'
    },
    {
      path: '/profile',
      icon: User,
      label: 'Profile',
      color: 'text-indigo-400'
    }
  ];

  if (isAdmin) {
    navItems.push(
      {
        path: '/admin',
        icon: Shield,
        label: 'Admin',
        color: 'text-red-400'
      },
      {
        path: '/users',
        icon: Users,
        label: 'Users',
        color: 'text-purple-400'
      }
    );
  }

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50">
      {/* User Info Bar */}
      <div className="px-6 py-3 border-b border-slate-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img
              src={currentUser?.profilePic || `https://ui-avatars.com/api/?name=${currentUser?.name}&background=3b82f6&color=fff`}
              alt={currentUser?.name}
              className="w-10 h-10 rounded-full border-2 border-slate-600 mr-3"
            />
            <div>
              <p className="text-white text-sm font-medium">{currentUser?.name}</p>
              <p className="text-slate-400 text-xs">
                {isAdmin ? 'Administrator' : 'Trader'} • Online
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-green-400 text-xs font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex items-center justify-around py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 min-w-[80px] ${
                isActive 
                  ? `bg-slate-700/50 ${item.color} scale-105` 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
        
        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center justify-center py-2 px-4 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-700/30 transition-all duration-200 min-w-[80px]"
          title="Logout"
        >
          <LogOut className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Navigation;