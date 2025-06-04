import React, { useState } from 'react';
import { Send, Users, Bell, TrendingUp, AlertCircle, Megaphone } from 'lucide-react';

const AdminPanel = ({ user, onNotification }) => {
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeUsers, setActiveUsers] = useState([
    { id: 1, name: 'TraderPro', status: 'online', lastSeen: 'now' },
    { id: 2, name: 'CryptoKing', status: 'online', lastSeen: 'now' },
    { id: 3, name: 'MarketWolf', status: 'online', lastSeen: '2m ago' },
    { id: 4, name: 'BullRunner', status: 'offline', lastSeen: '15m ago' },
    { id: 5, name: 'DiamondHands', status: 'online', lastSeen: 'now' },
  ]);

  const [stats, setStats] = useState({
    totalUsers: 47,
    activeNow: 12,
    messagesSent: 1543,
    alertsSent: 28
  });

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Trigger notification to all users
      onNotification({
        type: 'admin',
        title: 'Admin Broadcast',
        message: broadcastMessage,
        timestamp: new Date().toISOString()
      });

      // Update stats
      setStats(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + 1,
        alertsSent: prev.alertsSent + 1
      }));

      setBroadcastMessage('');
      
      // Show success notification
      onNotification({
        type: 'success',
        title: 'Broadcast Sent',
        message: 'Message sent to all active users',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      onNotification({
        type: 'error',
        title: 'Broadcast Failed',
        message: 'Failed to send message. Please try again.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendQuickAlert = async (type, message) => {
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      onNotification({
        type: 'admin',
        title: `${type} Alert`,
        message: message,
        timestamp: new Date().toISOString()
      });

      setStats(prev => ({
        ...prev,
        alertsSent: prev.alertsSent + 1
      }));

      onNotification({
        type: 'success',
        title: 'Alert Sent',
        message: `${type} alert sent to all users`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      onNotification({
        type: 'error',
        title: 'Alert Failed',
        message: 'Failed to send alert',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
          <AlertCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400">Manage team communications</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
          <p className="text-slate-400 text-sm">Total Users</p>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="w-6 h-6 bg-green-500 rounded-full mx-auto mb-2"></div>
          <p className="text-2xl font-bold text-white">{stats.activeNow}</p>
          <p className="text-slate-400 text-sm">Online Now</p>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <Send className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{stats.messagesSent}</p>
          <p className="text-slate-400 text-sm">Messages Sent</p>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <Bell className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{stats.alertsSent}</p>
          <p className="text-slate-400 text-sm">Alerts Sent</p>
        </div>
      </div>

      {/* Broadcast Section */}
      <div className="admin-broadcast mb-6">
        <div className="flex items-center mb-4">
          <Megaphone className="w-6 h-6 text-white mr-2" />
          <h2 className="text-lg font-semibold text-white">Broadcast Message</h2>
        </div>
        
        <div className="space-y-4">
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Type your message to all team members..."
            className="mobile-input resize-none"
            rows="3"
            disabled={isLoading}
          />
          
          <button
            onClick={handleBroadcast}
            disabled={!broadcastMessage.trim() || isLoading}
            className="w-full bg-gradient-to-r from-red-500 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl touch-button disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="loading-spinner mr-2"></div>
                Sending...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Megaphone className="w-5 h-5 mr-2" />
                Broadcast to All Users
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Quick Alerts</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => sendQuickAlert('Trading', '🚨 New high-priority trading signal available!')}
            disabled={isLoading}
            className="bg-green-600 text-white p-3 rounded-xl touch-button disabled:opacity-50"
          >
            <TrendingUp className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Trading Alert</span>
          </button>
          
          <button
            onClick={() => sendQuickAlert('Market', '📊 Important market update - check your positions!')}
            disabled={isLoading}
            className="bg-blue-600 text-white p-3 rounded-xl touch-button disabled:opacity-50"
          >
            <AlertCircle className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Market Update</span>
          </button>
          
          <button
            onClick={() => sendQuickAlert('Meeting', '📅 Team meeting starting in 15 minutes!')}
            disabled={isLoading}
            className="bg-purple-600 text-white p-3 rounded-xl touch-button disabled:opacity-50"
          >
            <Users className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Meeting Alert</span>
          </button>
          
          <button
            onClick={() => sendQuickAlert('System', '⚙️ System maintenance scheduled for tonight.')}
            disabled={isLoading}
            className="bg-orange-600 text-white p-3 rounded-xl touch-button disabled:opacity-50"
          >
            <Bell className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">System Alert</span>
          </button>
        </div>
      </div>

      {/* Active Users */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-white mb-3">Active Users</h3>
        <div className="space-y-3 overflow-y-auto">
          {activeUsers.map((user) => (
            <div key={user.id} className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                }`}></div>
                <div>
                  <p className="text-white font-medium">{user.name}</p>
                  <p className="text-slate-400 text-sm">Last seen: {user.lastSeen}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                user.status === 'online' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {user.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;