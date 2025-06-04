```javascript
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './index.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://cashoutai.onrender.com';
const API = `${BACKEND_URL}/api`;

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessageId, setLastMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Mobile notification system
  const showNotificationBanner = (message, isAdmin = false) => {
    const banner = document.getElementById('notification-banner');
    const content = document.getElementById('notification-content');
    
    if (banner && content) {
      content.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span>${isAdmin ? '👑 Admin: ' : ''}${message}</span>
          <button onclick="this.parentElement.parentElement.parentElement.classList.remove('show')" 
                  style="background: none; border: none; color: inherit; font-size: 18px; cursor: pointer;">×</button>
        </div>
      `;
      
      banner.className = `notification-banner show ${isAdmin ? 'admin' : ''}`;
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        banner.classList.remove('show');
      }, 5000);
    }
  };

  // Mobile-safe sound notification
  const playNotificationSound = () => {
    try {
      // Create simple beep sound for mobile
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio not available');
    }
  };

  // Mobile vibration
  const vibratePhone = () => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]); // Pattern: vibrate, pause, vibrate
      }
    } catch (error) {
      console.log('Vibration not available');
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView();
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection for real-time messages
  useEffect(() => {
    if (currentUser && !wsRef.current) {
      try {
        const wsProtocol = BACKEND_URL.startsWith('https://') ? 'wss://' : 'ws://';
        const wsHost = BACKEND_URL.replace('https://', '').replace('http://', '');
        const wsUrl = `${wsProtocol}${wsHost}/ws/${currentUser.id}`;
        
        console.log('Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setIsConnected(true);
          console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
          setIsConnected(true);
          
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'message') {
              const newMsg = data.data;
              setMessages(prev => [...prev, newMsg]);
              
              // Only notify for other users' messages
              if (newMsg.user_id !== currentUser.id) {
                setUnreadCount(prev => prev + 1);
                
                // Admin message notifications
                if (newMsg.is_admin) {
                  showNotificationBanner(`${newMsg.content}`, true);
                  playNotificationSound();
                  vibratePhone();
                } else {
                  showNotificationBanner(`${newMsg.username}: ${newMsg.content.substring(0, 50)}...`);
                  playNotificationSound();
                }
              }
            }
          } catch (error) {
            console.log('WebSocket message parsing failed');
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
        };

        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;
        };

        wsRef.current = ws;
      } catch (error) {
        console.log('WebSocket not supported');
      }
    }

    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (error) {
          console.log('WebSocket close error');
        }
        wsRef.current = null;
      }
    };
  }, [currentUser]);

  // Load messages
  useEffect(() => {
    if (currentUser) {
      loadMessages();
    }
  }, [currentUser]);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/users/login`, {
        username: loginForm.username,
        password: loginForm.password
      });
      setCurrentUser(response.data);
      setShowLogin(false);
      setUnreadCount(0);
    } catch (error) {
      alert(error.response?.data?.detail || 'Login failed');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    try {
      await axios.post(`${API}/messages`, {
        content: newMessage,
        user_id: currentUser.id
      });
      setNewMessage('');
      
      // Reset unread count when user sends message
      setUnreadCount(0);
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.response?.status === 403) {
        alert('Only approved users can send messages');
      }
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setShowLogin(true);
    setMessages([]);
    setUnreadCount(0);
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (error) {
        console.log('WebSocket close error');
      }
      wsRef.current = null;
    }
  };

  // Format message content with stock ticker highlighting
  const formatMessageContent = (content, tickers) => {
    if (!tickers || tickers.length === 0) return content;
    
    let formattedContent = content;
    tickers.forEach(ticker => {
      const regex = new RegExp(`\\$${ticker}`, 'gi');
      formattedContent = formattedContent.replace(regex, 
        `<span style="color: #3b82f6; font-weight: bold; background: rgba(59, 130, 246, 0.1); padding: 2px 4px; border-radius: 4px;">$${ticker}</span>`
      );
    });
    
    return formattedContent;
  };

  // Clear notifications when user interacts
  const handleChatFocus = () => {
    setUnreadCount(0);
    const banner = document.getElementById('notification-banner');
    if (banner) {
      banner.classList.remove('show');
    }
  };

  if (showLogin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '40px 30px',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          {/* Logo and Title */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 20px',
              border: '2px solid rgba(59, 130, 246, 0.3)'
            }}>
              🦚
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
              CashOutAi
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '16px' }}>
              Mobile Trading Team Chat
            </p>
          </div>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              style={{
                width: '100%',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '16px',
                outline: 'none'
              }}
              className="mobile-input"
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              style={{
                width: '100%',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '16px',
                outline: 'none'
              }}
              className="mobile-input"
              required
            />
            
            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                minHeight: '48px'
              }}
              className="mobile-button"
            >
              Login to Trading Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            🦚
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>
              CashOutAi Mobile
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isConnected ? '#10b981' : '#ef4444'
              }}></div>
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {unreadCount > 0 && (
            <div style={{
              background: '#ef4444',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
              {currentUser?.username}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>
              {currentUser?.is_admin ? 'Admin' : 'Member'}
            </div>
          </div>
          
          <button
            onClick={logout}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '36px'
            }}
            className="mobile-button"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        onClick={handleChatFocus}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          WebkitOverflowScrolling: 'touch'
        }}
        className="chat-container chat-messages"
      >
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            style={{
              background: message.is_admin 
                ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                : 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: message.is_admin 
                ? '2px solid #fbbf24'
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '12px 16px',
              maxWidth: '85%',
              alignSelf: message.user_id === currentUser?.id ? 'flex-end' : 'flex-start',
              boxShadow: message.is_admin 
                ? '0 4px 20px rgba(251, 191, 36, 0.3)'
                : '0 2px 10px rgba(0, 0, 0, 0.1)',
              animation: message.is_admin ? 'adminGlow 2s infinite' : 'none'
            }}
            className={message.is_admin ? 'admin-message' : ''}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: message.is_admin ? '#000' : '#3b82f6'
              }}>
                {message.is_admin ? '👑 ' : ''}{message.username}
              </span>
              <span style={{
                fontSize: '10px',
                color: message.is_admin ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'
              }}>
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            
            <div
              style={{
                color: message.is_admin ? '#000' : 'white',
                fontSize: '14px',
                lineHeight: '1.4',
                fontWeight: message.is_admin ? 'bold' : 'normal'
              }}
              dangerouslySetInnerHTML={{
                __html: formatMessageContent(
                  message.content, 
                  message.highlighted_tickers || []
                )
              }}
            />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div style={{
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '25px',
              color: 'white',
              fontSize: '16px',
              outline: 'none'
            }}
            className="mobile-input"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            style={{
              background: newMessage.trim() 
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: '18px'
            }}
            className="mobile-button"
          >
            📤
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
```
