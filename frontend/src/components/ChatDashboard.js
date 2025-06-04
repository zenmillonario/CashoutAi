import React, { useState, useEffect, useRef } from 'react';
import { Send, TrendingUp, AlertCircle, Users, Paperclip, Smile } from 'lucide-react';

const ChatDashboard = ({ user, allUsers = [], onNotification }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'Admin',
      userId: 'admin_001',
      role: 'admin',
      message: '🚀 Welcome to CashOutAI Team Trading Chat! This is a private communication channel for our trading team members only.',
      timestamp: new Date(Date.now() - 300000).toISOString()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(1);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Safely calculate online users
    const onlineCount = Array.isArray(allUsers) ? allUsers.filter(u => u?.isOnline).length : 1;
    setOnlineUsers(onlineCount);
  }, [allUsers]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      user: user?.name || 'Unknown User',
      userId: user?.id || 'unknown',
      role: user?.role || 'trader',
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Admin messages trigger notifications
    if (user?.role === 'admin' && onNotification) {
      onNotification({
        type: 'admin',
        title: 'Admin Message',
        message: newMessage.trim(),
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageStyle = (msgRole, msgUserId) => {
    if (msgUserId === user?.id) {
      return 'bg-blue-500 text-white ml-auto';
    } else if (msgRole === 'admin') {
      return 'bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-400/30';
    } else {
      return 'bg-slate-700 text-white';
    }
  };

  const getUserProfilePic = (userId) => {
    if (!Array.isArray(allUsers)) return `https://ui-avatars.com/api/?name=User&background=6b7280&color=fff`;
    
    const foundUser = allUsers.find(u => u?.id === userId);
    return foundUser?.profilePic || `https://ui-avatars.com/api/?name=User&background=6b7280&color=fff`;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/80 backdrop-blur-lg p-4 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Team Trading Chat</h1>
              <div className="flex items-center text-sm text-slate-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <Users className="w-4 h-4 mr-1" />
                {onlineUsers} members online • Private Team Channel
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Welcome back</p>
            <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
            <span className="text-xs text-slate-500 capitalize">{user?.role || 'member'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <div className={`max-w-4xl p-4 rounded-xl break-words ${getMessageStyle(msg.role, msg.userId)} ${
              msg.userId === user?.id ? 'self-end' : 'self-start'
            }`}>
              {msg.userId !== user?.id && (
                <div className="flex items-center mb-2">
                  <img
                    src={getUserProfilePic(msg.userId)}
                    alt={msg.user}
                    className="w-6 h-6 rounded-full mr-2"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.user)}&background=6b7280&color=fff`;
                    }}
                  />
                  <span className="text-sm font-medium opacity-90">{msg.user}</span>
                  {msg.role === 'admin' && (
                    <AlertCircle className="w-4 h-4 ml-1 text-red-200" />
                  )}
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
              <p className="text-xs opacity-75 mt-2">{formatTime(msg.timestamp)}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50 p-4 shrink-0">
        <div className="flex items-end space-x-3 max-w-6xl mx-auto">
          <button className="p-3 text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none min-h-[44px] max-h-[120px]"
              rows="1"
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-300 transition-colors">
              <Smile className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <div className="text-xs text-slate-500 mt-2 text-center">
          Private team channel • Only verified team members can post messages
        </div>
      </div>
    </div>
  );
};

export default ChatDashboard;