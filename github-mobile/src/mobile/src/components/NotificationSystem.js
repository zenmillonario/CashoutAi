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
        return 'notification-banner';
      case 'success':
        return 'notification-banner notification-success';
      case 'warning':
        return 'notification-banner notification-warning';
      case 'error':
        return 'notification-banner';
      default:
        return 'notification-banner';
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
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }
    });
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getNotificationStyle(notification.type)} notification-enter`}
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div 
              className="h-full bg-white/30 rounded-full"
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
      `}</style>
    </div>
  );
};

export default NotificationSystem;