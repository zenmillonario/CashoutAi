import React, { useState, useEffect, useRef } from 'react';
import { Send, TrendingUp, AlertCircle, Users } from 'lucide-react';

const ChatDashboard = ({ user, onNotification }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      user: 'Admin',
      role: 'admin',
      message: 'Welcome to CashOutAI Mobile! 🚀 Trading signals and team updates will appear here.',
      timestamp: new Date(Date.now() - 60000).toISOString()
    },
    {
      id: 2,
      user: 'TraderBot',
      role: 'bot',
      message: 'BTCUSDT showing strong bullish momentum. Consider long positions above $43,500.',
      timestamp: new Date(Date.now() - 30000).toISOString()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(12);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        addRandomMessage();
      }
      
      // Update online users count
      setOnlineUsers(prev => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const addRandomMessage = () => {
    const randomMessages = [
      {
        user: 'Admin',
        role: 'admin',
        message: '🚨 IMPORTANT: New trading signals available. Check your portfolio for updates!'
      },
      {
        user: 'SignalBot',
        role: 'bot',
        message: 'ETHUSDT breaking resistance at $2,650. Strong buy signal detected! 📈'
      },
      {
        user: 'MarketAnalyst',
        role: 'trader',
        message: 'Gold showing bullish divergence. Great entry point for long positions.'
      },
      {
        user: 'Admin',
        role: 'admin',
        message: 'Team meeting in 30 minutes. Please check your notifications! 🔔'
      }
    ];

    const randomMsg = randomMessages[Math.floor(Math.random() * randomMessages.length)];
    const newMsg = {
      id: Date.now(),
      ...randomMsg,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);

    // Trigger notification for admin messages
    if (randomMsg.role === 'admin') {
      onNotification({
        type: 'admin',
        title: 'Admin Message',
        message: randomMsg.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now(),
      user: user.name,
      role: user.role,
      message: newMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      
      // Auto-reply for demo
      if (Math.random() > 0.5) {
        setTimeout(() => {
          const reply = {
            id: Date.now() + 1,
            user: 'TraderBot',
            role: 'bot',
            message: `Great insight, ${user.name}! The market is looking promising today. 📊`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, reply]);
        }, 1000);
      }
    }, 2000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageStyle = (msgRole, msgUser) => {
    if (msgUser === user.name) {
      return 'message-bubble message-own ml-auto bg-blue-500';
    } else if (msgRole === 'admin') {
      return 'message-bubble message-admin';
    } else {
      return 'message-bubble message-other';
    }
  };

  return (
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
          <div className="text-right">
            <p className="text-sm text-slate-400">Welcome</p>
            <p className="text-sm font-medium text-white">{user.name}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ paddingBottom: '100px' }}>
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <div className={getMessageStyle(msg.role, msg.user)}>
              <div className="p-3 rounded-2xl">
                {msg.user !== user.name && (
                  <div className="flex items-center mb-1">
                    <span className="text-xs font-medium text-slate-300">{msg.user}</span>
                    {msg.role === 'admin' && (
                      <AlertCircle className="w-3 h-3 ml-1 text-red-400" />
                    )}
                  </div>
                )}
                <p className="text-white text-sm leading-relaxed">{msg.message}</p>
                <p className="text-xs text-slate-400 mt-1">{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message-bubble message-other">
            <div className="p-3 rounded-2xl bg-slate-600/50">
              <div className="flex items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-slate-400 ml-2">Someone is typing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="mobile-input resize-none"
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
            className="touch-button bg-blue-500 text-white rounded-xl p-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatDashboard;