import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Simple Login Component
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });

      if (response.data.success) {
        onLogin(response.data.user);
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: 'white', fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>CashOutAI</h1>
          <p style={{ color: '#94a3b8' }}>Team Trading Platform</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(71, 85, 105, 0.5)' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontSize: '14px' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '12px', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '12px', color: 'white', fontSize: '16px', boxSizing: 'border-box' }}
              placeholder="Enter username"
              disabled={isLoading}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontSize: '14px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '12px', color: 'white', fontSize: '16px', boxSizing: 'border-box' }}
              placeholder="Enter password"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px' }}>
              <p style={{ color: '#f87171', margin: 0, fontSize: '14px' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!username || !password || isLoading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: (username && password && !isLoading) ? '#3b82f6' : '#6b7280', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              fontSize: '16px', 
              fontWeight: '600', 
              cursor: (username && password && !isLoading) ? 'pointer' : 'not-allowed' 
            }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(30, 41, 59, 0.3)', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
            Contact your administrator for login credentials
          </p>
        </div>
      </div>
    </div>
  );
};

// Enhanced Chat Component with real user chat and profile settings
const ChatScreen = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    profile_picture: user.profile_picture || ''
  });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadMessages();
    loadOnlineUsers();
    
    // Set up periodic refresh for online users
    const interval = setInterval(loadOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API}/chat/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const updateProfile = async () => {
    setIsLoading(true);
    try {
      await axios.put(`${API}/users/me/${user.id}/profile`, profileData);
      
      // Update localStorage
      const updatedUser = { ...user, ...profileData };
      localStorage.setItem('cashoutai_desktop_user', JSON.stringify(updatedUser));
      
      setShowProfileModal(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getProfileIcon = (userData) => {
    if (userData.profile_picture) {
      return (
        <img 
          src={userData.profile_picture} 
          alt="Profile" 
          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
        />
      );
    }
    return (
      <div style={{ 
        width: '32px', 
        height: '32px', 
        background: '#3b82f6', 
        borderRadius: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        {userData.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;
    
    setIsLoading(true);
    try {
      await axios.post(`${API}/chat/messages?user_id=${user.id}`, {
        message: newMessage.trim()
      });
      
      setNewMessage('');
      // Reload messages to show the new one
      setTimeout(loadMessages, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '16px', borderBottom: '1px solid #475569' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '20px' }}>Team Chat</h1>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
              {onlineUsers} user{onlineUsers !== 1 ? 's' : ''} online
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                background: user.profile_picture || '#3b82f6', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginRight: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {user.profile_picture ? '' : user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ color: 'white', margin: 0, fontSize: '14px' }}>{user.name}</p>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '12px' }}>{user.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '50px' }}>
            <p>Welcome to the team chat! Start a conversation below.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: '16px' }}>
              <div style={{
                background: msg.user_id === user.id ? '#3b82f6' : (msg.role === 'admin' ? '#ef4444' : '#6b7280'),
                color: 'white',
                padding: '12px',
                borderRadius: '16px',
                maxWidth: '70%',
                marginLeft: msg.user_id === user.id ? 'auto' : '0',
                marginRight: msg.user_id === user.id ? '0' : 'auto'
              }}>
                {msg.user_id !== user.id && (
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                    {msg.username}
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '14px' }}>{msg.message}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.7 }}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ background: '#1e293b', padding: '16px', borderTop: '1px solid #475569', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            style={{ flex: 1, padding: '12px', background: '#374151', border: '1px solid #6b7280', borderRadius: '12px', color: 'white', fontSize: '16px' }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendMessage();
              }
            }}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isLoading}
            style={{ 
              padding: '12px 16px', 
              background: (newMessage.trim() && !isLoading) ? '#3b82f6' : '#6b7280', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              cursor: (newMessage.trim() && !isLoading) ? 'pointer' : 'not-allowed',
              zIndex: 20,
              position: 'relative'
            }}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('cashoutai_desktop_user');
    const savedAuth = localStorage.getItem('cashoutai_desktop_auth');
    
    if (savedUser && savedAuth === 'true') {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('cashoutai_desktop_user');
        localStorage.removeItem('cashoutai_desktop_auth');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    
    localStorage.setItem('cashoutai_desktop_user', JSON.stringify(userData));
    localStorage.setItem('cashoutai_desktop_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    
    localStorage.removeItem('cashoutai_desktop_user');
    localStorage.removeItem('cashoutai_desktop_auth');
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <ChatScreen user={user} onLogout={handleLogout} />;
}

export default App;
