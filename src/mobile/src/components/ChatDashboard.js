import React, { useState, useEffect, useRef } from 'react';
import { Send, TrendingUp, Users, User, Settings } from 'lucide-react';

const ChatDashboard = ({ user, onNotification }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    profile_picture: user.profile_picture || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load existing messages from localStorage for demo
    const savedMessages = localStorage.getItem('cashoutai_mobile_messages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }

    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Save messages to localStorage whenever they change
    localStorage.setItem('cashoutai_mobile_messages', JSON.stringify(messages));
    
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || isLoading) return;

    const message = {
      id: Date.now(),
      user_id: user.id,
      username: user.name,
      role: user.role,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate online users activity
    setOnlineUsers(prev => Math.max(1, prev + (Math.random() > 0.5 ? 1 : -1)));
  };

  const handleProfileUpdate = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Update user data
      const updatedUser = {
        ...user,
        name: profileData.name,
        profile_picture: profileData.profile_picture
      };
      
      // Save to localStorage
      localStorage.setItem('cashoutai_user', JSON.stringify(updatedUser));
      
      setIsLoading(false);
      setShowProfileModal(false);
      
      // Show success notification
      onNotification({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully!',
        timestamp: new Date().toISOString()
      });
    }, 1000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageStyle = (msgRole, msgUserId) => {
    if (msgUserId === user.id) {
      return 'message-bubble message-own ml-auto bg-blue-500';
    } else if (msgRole === 'admin') {
      return 'message-bubble message-admin';
    } else {
      return 'message-bubble message-other';
    }
  };

  const getProfileIcon = (userData) => {
    if (userData.profile_picture) {
      return (
        <img 
          src={userData.profile_picture} 
          alt="Profile" 
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <span className="text-white font-bold text-sm">
          {userData.name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full bg-slate-900">
        {/* Header */}
        <div className="bg-slate-800/80 backdrop-blur-lg p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Trading Chat</h1>
                <div className="flex items-center text-sm text-slate-400">
                  <div className="status-online"></div>
                  <Users className="w-4 h-4 mr-1" />
                  {onlineUsers} online
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
              <div className="text-right">
                <p className="text-sm text-slate-400">Welcome</p>
                <p className="text-sm font-medium text-white">{user.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ paddingBottom: '120px' }}>
          {messages.length === 0 ? (
            <div className="text-center text-slate-400 mt-8">
              <p>Welcome to the team chat!</p>
              <p className="text-sm mt-2">Start a conversation below.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                <div className={getMessageStyle(msg.role, msg.user_id)}>
                  <div className="p-3 rounded-2xl">
                    {msg.user_id !== user.id && (
                      <div className="flex items-center mb-1">
                        <span className="text-xs font-medium text-slate-300">{msg.username}</span>
                        {msg.role === 'admin' && (
                          <div className="w-2 h-2 bg-red-400 rounded-full ml-1"></div>
                        )}
                      </div>
                    )}
                    <p className="text-white text-sm leading-relaxed">{msg.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatTime(msg.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Input Area */}
        <div className="fixed bottom-16 left-0 right-0 bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50 p-4 z-50">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full p-3 bg-slate-700/70 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="1"
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:opacity-50 text-white rounded-xl p-3 transition-colors disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Update Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                {getProfileIcon({ name: profileData.name, profile_picture: profileData.profile_picture })}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Profile Picture URL
                </label>
                <input
                  type="url"
                  value={profileData.profile_picture}
                  onChange={(e) => setProfileData(prev => ({ ...prev, profile_picture: e.target.value }))}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProfileUpdate}
                  disabled={isLoading || !profileData.name.trim()}
                  className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatDashboard;
