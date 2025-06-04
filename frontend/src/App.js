import React, { useState } from 'react';
import './App.css';

// Simple Login Component
const LoginScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username && password) {
      onLogin({ username, password });
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
              style={{ width: '100%', padding: '12px', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '12px', color: 'white', fontSize: '16px' }}
              placeholder="Enter username"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '8px', fontSize: '14px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '12px', color: 'white', fontSize: '16px' }}
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={!username || !password}
            style={{ width: '100%', padding: '12px', background: username && password ? '#3b82f6' : '#6b7280', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: username && password ? 'pointer' : 'not-allowed' }}
          >
            Sign In
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

// Simple Chat Component
const ChatScreen = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([
    { id: 1, user: 'Admin', message: '🚀 Welcome to CashOutAI! Private team chat.', timestamp: new Date().toISOString() }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now(),
      user: user.name,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '16px', borderBottom: '1px solid #475569' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '20px' }}>Team Chat</h1>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Private Channel</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'white', margin: 0, fontSize: '14px' }}>{user.name}</p>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '12px' }}>{user.role}</p>
            <button
              onClick={onLogout}
              style={{ marginTop: '8px', padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: '16px' }}>
            <div style={{
              background: msg.user === user.name ? '#3b82f6' : (msg.user === 'Admin' ? '#ef4444' : '#6b7280'),
              color: 'white',
              padding: '12px',
              borderRadius: '16px',
              maxWidth: '70%',
              marginLeft: msg.user === user.name ? 'auto' : '0',
              marginRight: msg.user === user.name ? '0' : 'auto'
            }}>
              {msg.user !== user.name && (
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                  {msg.user}
                </div>
              )}
              <p style={{ margin: 0, fontSize: '14px' }}>{msg.message}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.7 }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ background: '#1e293b', padding: '16px', borderTop: '1px solid #475569' }}>
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
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            style={{ padding: '12px 16px', background: newMessage.trim() ? '#3b82f6' : '#6b7280', color: 'white', border: 'none', borderRadius: '12px', cursor: newMessage.trim() ? 'pointer' : 'not-allowed' }}
          >
            Send
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

  const handleLogin = (credentials) => {
    // Admin login
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      setUser({ name: 'Admin User', role: 'admin' });
      setIsAuthenticated(true);
      return;
    }

    // Regular user
    if (credentials.username && credentials.password) {
      setUser({ name: credentials.username, role: 'trader' });
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <ChatScreen user={user} onLogout={handleLogout} />;
}

export default App;