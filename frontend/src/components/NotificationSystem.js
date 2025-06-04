import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const NotificationSystem = ({ notifications }) => {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'admin':
        return <AlertCircle className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'admin':
        return 'bg-red-500/90 border-red-400/50 text-white';
      case 'success':
        return 'bg-green-500/90 border-green-400/50 text-white';
      case 'warning':
        return 'bg-yellow-500/90 border-yellow-400/50 text-white';
      case 'error':
        return 'bg-red-500/90 border-red-400/50 text-white';
      default:
        return 'bg-blue-500/90 border-blue-400/50 text-white';
    }
  };

  // Browser notification for admin messages
  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.type === 'admin' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('CashOutAI - Admin Message', {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'admin-message',
          requireInteraction: true
        });
      }
    });
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getNotificationStyle(notification.type)} backdrop-blur-lg rounded-xl p-4 border shadow-2xl animate-in slide-in-from-right duration-300`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="mr-3 mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">
                  {notification.title}
                </h4>
                <p className="text-sm opacity-90">
                  {notification.message}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Progress bar for auto-dismiss */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-xl overflow-hidden">
            <div 
              className="h-full bg-white/30"
              style={{
                animation: 'shrink 5s linear forwards'
              }}
            ></div>
          </div>
        </div>
      ))}
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes slide-in-from-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default NotificationSystem;