import React from 'react';
import { MessageCircle, PieChart, Settings, LogOut, Shield } from 'lucide-react';

const Navigation = ({ isAdmin, onLogout, currentUser }) => {
  const [activeTab, setActiveTab] = React.useState('/');

  React.useEffect(() => {
    setActiveTab(window.location.pathname);
  }, []);

  const handleNavigation = (path) => {
    setActiveTab(path);
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

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
    }
  ];

  if (isAdmin) {
    navItems.push({
      path: '/admin',
      icon: Shield,
      label: 'Admin',
      color: 'text-red-400'
    });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`touch-button flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all duration-200 ${
                isActive 
                  ? `bg-slate-700/50 ${item.color}` 
                  : 'text-slate-400 hover:text-white'
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
          className="touch-button flex flex-col items-center justify-center py-2 px-4 rounded-xl text-slate-400 hover:text-red-400 transition-colors duration-200"
        >
          <LogOut className="w-6 h-6 mb-1" />
          <span className="text-xs font-medium">Logout</span>
        </button>
      </div>
      
      {/* User Info Bar */}
      <div className="px-4 pb-2">
        <div className="bg-slate-700/30 rounded-lg p-2 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
              <span className="text-white text-xs font-bold">
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{currentUser?.name}</p>
              <p className="text-slate-400 text-xs">
                {isAdmin ? 'Administrator' : 'Trader'}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-green-400 text-xs">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;