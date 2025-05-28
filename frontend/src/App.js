import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', email: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [userTrades, setUserTrades] = useState([]);
  const [userPerformance, setUserPerformance] = useState(null);
  const [openPositions, setOpenPositions] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    username: '',
    email: '',
    avatar_url: ''
  });
  const [tradeForm, setTradeForm] = useState({
    symbol: '',
    action: 'BUY',
    quantity: '',
    price: '',
    notes: '',
    stop_loss: ''
  });
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    if (currentUser && !wsRef.current) {
      // Build WebSocket URL correctly
      const wsProtocol = BACKEND_URL.startsWith('https://') ? 'wss://' : 'ws://';
      const wsHost = BACKEND_URL.replace('https://', '').replace('http://', '');
      const wsUrl = `${wsProtocol}${wsHost}/ws/${currentUser.id}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected successfully');
        // Send a heartbeat to establish connection
        ws.send(JSON.stringify({ type: 'heartbeat', message: 'ping' }));
      };

      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        // Any message received means connection is active
        setIsConnected(true);
        
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connection' || data.type === 'heartbeat') {
            // Connection confirmed
            setIsConnected(true);
            console.log('WebSocket connection confirmed');
          } else if (data.type === 'message') {
            setMessages(prev => [...prev, data.data]);
          } else if (data.type === 'new_registration' && currentUser.is_admin) {
            // Show notification for admins
            if (Notification.permission === 'granted') {
              new Notification('New User Registration', {
                body: data.message,
                icon: '/favicon.ico'
              });
            }
            loadPendingUsers();
          } else if (data.type === 'user_approval' && currentUser.is_admin) {
            if (Notification.permission === 'granted') {
              new Notification('User Status Updated', {
                body: data.message,
                icon: '/favicon.ico'
              });
            }
            loadPendingUsers();
          }
        } catch (error) {
          console.log('WebSocket message (raw):', event.data);
          // Even if message parsing fails, connection is working
          setIsConnected(true);
        }
        
        // Send periodic heartbeat to keep connection alive
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat', message: 'ping' }));
          }
        }, 30000); // Every 30 seconds
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        
        // Auto-reconnect after 3 seconds if not manual close
        if (event.code !== 1000 && currentUser) {
          setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            // Trigger reconnection by clearing the ref
          }, 3000);
        }
      };

      wsRef.current = ws;
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [currentUser]);

  // Request notification permission
  useEffect(() => {
    if (currentUser && currentUser.is_admin && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [currentUser]);

  // Load data on login
  useEffect(() => {
    if (currentUser) {
      loadMessages();
      loadUserTrades();
      loadOpenPositions();
      loadUserPerformance();
      if (currentUser.is_admin) {
        loadPendingUsers();
      }
      
      // Set up interval to refresh positions every 30 seconds
      const interval = setInterval(() => {
        loadOpenPositions();
      }, 30000);
      
      return () => clearInterval(interval);
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

  const loadPendingUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/pending`);
      setPendingUsers(response.data);
    } catch (error) {
      console.error('Error loading pending users:', error);
    }
  };

  const loadUserTrades = async () => {
    if (!currentUser) return;
    try {
      const response = await axios.get(`${API}/trades/${currentUser.id}`);
      setUserTrades(response.data);
    } catch (error) {
      console.error('Error loading trades:', error);
    }
  };

  const loadOpenPositions = async () => {
    if (!currentUser) return;
    try {
      const response = await axios.get(`${API}/positions/${currentUser.id}`);
      setOpenPositions(response.data);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  const closePosition = async (positionId, symbol) => {
    if (!window.confirm(`Are you sure you want to close your ${symbol} position at current market price?`)) {
      return;
    }

    try {
      const response = await axios.post(`${API}/positions/${positionId}/close?user_id=${currentUser.id}`);
      alert(`Position closed! Realized P&L: $${response.data.realized_pnl}`);
      loadOpenPositions();
      loadUserTrades();
      loadUserPerformance();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error closing position');
    }
  };

  const loadUserPerformance = async () => {
    if (!currentUser) return;
    try {
      const response = await axios.get(`${API}/users/${currentUser.id}/performance`);
      setUserPerformance(response.data);
    } catch (error) {
      console.error('Error loading performance:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (isRegistering) {
        response = await axios.post(`${API}/users/register`, loginForm);
        alert('Registration successful! Please wait for admin approval before you can login.');
        setIsRegistering(false);
        setLoginForm({ username: '', email: '', password: '' });
        return;
      } else {
        response = await axios.post(`${API}/users/login`, {
          username: loginForm.username,
          password: loginForm.password
        });
      }
      setCurrentUser(response.data);
      setShowLogin(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Login failed');
    }
  };

  const handleApproval = async (userId, approved) => {
    try {
      await axios.post(`${API}/users/approve`, {
        user_id: userId,
        approved: approved,
        admin_id: currentUser.id
      });
      loadPendingUsers();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error processing approval');
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
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.response?.status === 403) {
        alert('Only approved users can send messages');
      }
    }
  };

  const submitTrade = async (e) => {
    e.preventDefault();
    if (!tradeForm.symbol || !tradeForm.quantity || !tradeForm.price) return;

    try {
      await axios.post(`${API}/trades?user_id=${currentUser.id}`, {
        symbol: tradeForm.symbol.toUpperCase(),
        action: tradeForm.action,
        quantity: parseInt(tradeForm.quantity),
        price: parseFloat(tradeForm.price),
        notes: tradeForm.notes
      });
      
      setTradeForm({
        symbol: '',
        action: 'BUY',
        quantity: '',
        price: '',
        notes: ''
      });
      
      // Show success message
      const tradeValue = (parseInt(tradeForm.quantity) * parseFloat(tradeForm.price)).toFixed(2);
      alert(`✅ Trade recorded successfully!\n${tradeForm.action} ${tradeForm.quantity} ${tradeForm.symbol.toUpperCase()} at $${tradeForm.price}\nTotal value: $${tradeValue}`);
      
      loadUserTrades();
      loadOpenPositions();
      loadUserPerformance();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error recording trade');
    }
  };

  const formatMessageContent = (content, tickers) => {
    if (!tickers || tickers.length === 0) return content;
    
    let formattedContent = content;
    tickers.forEach(ticker => {
      const regex = new RegExp(`\\$${ticker}`, 'gi');
      formattedContent = formattedContent.replace(regex, `<span class="stock-ticker">$${ticker}</span>`);
    });
    
    return formattedContent;
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API}/users/${currentUser.id}/profile`, editProfileForm);
      setCurrentUser(response.data);
      setShowEditProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error updating profile');
    }
  };

  const updateAvatar = async (avatarUrl) => {
    try {
      await axios.post(`${API}/users/${currentUser.id}/avatar?avatar_url=${encodeURIComponent(avatarUrl)}`);
      setCurrentUser({...currentUser, avatar_url: avatarUrl});
      setEditProfileForm({...editProfileForm, avatar_url: avatarUrl});
      alert('Avatar updated successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Error updating avatar');
    }
  };

  const openEditProfile = () => {
    setEditProfileForm({
      username: currentUser.username,
      email: currentUser.email,
      avatar_url: currentUser.avatar_url || ''
    });
    setShowEditProfile(true);
  };

  const logout = () => {
    setCurrentUser(null);
    setShowLogin(true);
    setMessages([]);
    setActiveTab('chat');
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="https://i.imgur.com/ZPYCiyg.png" 
                alt="CashOutAi Peacock Logo" 
                className="w-20 h-20 rounded-xl border-2 border-blue-400/50 mr-4 bg-white/10 p-1"
                onError={(e) => {
                  e.target.src = 'https://i.imgur.com/ZPYCiyg.jpg';
                  e.target.onerror = () => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  };
                }}
              />
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl border-2 border-blue-400/50 mr-4 hidden">
                🦚
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">CashOutAi</h1>
              </div>
            </div>
            <p className="text-gray-300">Trade Together, Win Together</p>
            <p className="text-sm text-yellow-400 mt-2">Private Trading Team</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                required
              />
            </div>
            
            {isRegistering && (
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  required
                />
              </div>
            )}
            
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              {isRegistering ? 'Register' : 'Login'}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
            </button>
          </div>
          
          {isRegistering && (
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm text-center">
                Registration requires admin approval for this private team
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img 
                src="https://i.imgur.com/ZPYCiyg.png" 
                alt="CashOutAi Peacock Logo" 
                className="w-10 h-10 rounded-lg border border-blue-400/50 bg-white/10 p-0.5"
                onError={(e) => {
                  e.target.src = 'https://i.imgur.com/ZPYCiyg.jpg';
                  e.target.onerror = () => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  };
                }}
              />
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg border border-blue-400/50 hidden">
                🦚
              </div>
              <h1 className="text-2xl font-bold text-white">CashOutAi</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-300">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Tab Navigation */}
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'chat' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('practice')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'practice' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Practice
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'profile' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Profile
              </button>
              {currentUser?.is_admin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === 'admin' ? 'bg-yellow-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Admin {pendingUsers.length > 0 && (
                    <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                      {pendingUsers.length}
                    </span>
                  )}
                </button>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-white font-semibold">{currentUser?.username}</div>
              <div className="text-xs text-gray-400">
                {currentUser?.is_admin ? 'Admin' : 'Member'}
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 h-[calc(100vh-80px)]">
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 mb-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
                      {message.avatar_url ? (
                        <img 
                          src={message.avatar_url} 
                          alt={message.username} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold ${message.avatar_url ? 'hidden' : 'flex'}`}>
                        {message.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`font-semibold ${message.is_admin ? 'text-yellow-400' : 'text-white'}`}>
                          {message.username}
                        </span>
                        {message.is_admin && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            Admin
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div 
                        className={`${message.is_admin ? 'font-bold text-white' : 'text-gray-300'}`}
                        dangerouslySetInnerHTML={{
                          __html: formatMessageContent(message.content, message.highlighted_tickers)
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="flex space-x-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message... (Use $TSLA for stock tickers)"
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Practice Tab */}
        {activeTab === 'practice' && (
          <div className="space-y-6">
            {/* Open Positions */}
            {openPositions.length > 0 && (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">📊 Open Positions</h2>
                <div className="space-y-4">
                  {openPositions.map((position) => (
                    <div key={position.id} className="bg-white/5 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className="text-white font-bold text-lg">{position.symbol}</div>
                          <div className="text-gray-300">
                            {position.quantity} shares @ ${position.avg_price}
                          </div>
                          <div className="text-gray-400 text-sm">
                            Opened: {new Date(position.opened_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-white font-semibold">
                              Current: ${position.current_price || 'Loading...'}
                            </div>
                            <div className={`text-sm font-bold ${
                              position.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl || '0.00'} 
                              {position.current_price && position.avg_price && (
                                <span className="ml-2">
                                  ({((position.current_price - position.avg_price) / position.avg_price * 100).toFixed(2)}%)
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => closePosition(position.id, position.symbol)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            Close Position
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total Portfolio P&L */}
                <div className="mt-6 p-4 bg-white/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">Total Unrealized P&L:</span>
                    <span className={`text-xl font-bold ${
                      openPositions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0) >= 0 
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {openPositions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0) >= 0 ? '+' : ''}
                      ${openPositions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trade Form */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">📈 Paper Trading</h2>
                <form onSubmit={submitTrade} className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Stock Symbol</label>
                    <input
                      type="text"
                      placeholder="TSLA"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={tradeForm.symbol}
                      onChange={(e) => setTradeForm({...tradeForm, symbol: e.target.value.toUpperCase()})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Action</label>
                    <select
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={tradeForm.action}
                      onChange={(e) => setTradeForm({...tradeForm, action: e.target.value})}
                    >
                      <option value="BUY">Buy</option>
                      <option value="SELL">Sell</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Quantity</label>
                      <input
                        type="number"
                        placeholder="100"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={tradeForm.quantity}
                        onChange={(e) => setTradeForm({...tradeForm, quantity: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-300 mb-2">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="250.00"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={tradeForm.price}
                        onChange={(e) => setTradeForm({...tradeForm, price: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Notes (Optional)</label>
                    <textarea
                      placeholder="Trade notes..."
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={tradeForm.notes}
                      onChange={(e) => setTradeForm({...tradeForm, notes: e.target.value})}
                      rows="3"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-200"
                  >
                    Record Trade
                  </button>
                </form>
              </div>

              {/* Recent Trades */}
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">📋 Recent Trades</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userTrades.map((trade) => (
                    <div key={trade.id} className="bg-white/5 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            trade.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trade.action}
                          </span>
                          <span className="text-white font-semibold">{trade.symbol}</span>
                          <span className="text-gray-300">{trade.quantity} shares</span>
                          {trade.is_closed && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                              CLOSED
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold">${trade.price}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(trade.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {trade.notes && (
                        <div className="mt-2 text-sm text-gray-400">{trade.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <div className="flex items-center space-x-6">
                {/* Profile Picture */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20">
                    {currentUser?.avatar_url ? (
                      <img 
                        src={currentUser.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl ${currentUser?.avatar_url ? 'hidden' : 'flex'}`}
                    >
                      {currentUser?.username?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <button
                    onClick={openEditProfile}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm hover:bg-blue-700 transition-colors"
                  >
                    ✏️
                  </button>
                </div>
                
                {/* Profile Info */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{currentUser?.username}</h2>
                  <p className="text-gray-300">{currentUser?.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    {currentUser?.is_admin && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                        Admin
                      </span>
                    )}
                    <span className="text-green-400 text-sm">
                      Member since {new Date(currentUser?.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={openEditProfile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Performance Stats */}
            {userPerformance && (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-6">Trading Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white/5 p-6 rounded-xl text-center">
                    <div className="text-3xl font-bold text-green-400">
                      ${userPerformance.total_profit.toFixed(2)}
                    </div>
                    <div className="text-gray-300 mt-2">Total Profit</div>
                  </div>
                  
                  <div className="bg-white/5 p-6 rounded-xl text-center">
                    <div className="text-3xl font-bold text-blue-400">
                      {userPerformance.win_percentage.toFixed(1)}%
                    </div>
                    <div className="text-gray-300 mt-2">Win Rate</div>
                  </div>
                  
                  <div className="bg-white/5 p-6 rounded-xl text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {userPerformance.trades_count}
                    </div>
                    <div className="text-gray-300 mt-2">Total Trades</div>
                  </div>
                  
                  <div className="bg-white/5 p-6 rounded-xl text-center">
                    <div className="text-3xl font-bold text-yellow-400">
                      ${userPerformance.average_gain.toFixed(2)}
                    </div>
                    <div className="text-gray-300 mt-2">Avg Gain</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && currentUser?.is_admin && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Admin Panel - Pending Approvals</h2>
            <div className="space-y-4">
              {pendingUsers.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No pending approvals
                </div>
              ) : (
                pendingUsers.map((user) => (
                  <div key={user.id} className="bg-white/5 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{user.username}</div>
                      <div className="text-gray-400 text-sm">{user.email}</div>
                      <div className="text-gray-500 text-xs">
                        Registered: {new Date(user.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproval(user.id, true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(user.id, false)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Edit Profile</h2>
            
            <form onSubmit={updateProfile} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editProfileForm.username}
                  onChange={(e) => setEditProfileForm({...editProfileForm, username: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editProfileForm.email}
                  onChange={(e) => setEditProfileForm({...editProfileForm, email: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Avatar URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/your-avatar.jpg"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editProfileForm.avatar_url}
                  onChange={(e) => setEditProfileForm({...editProfileForm, avatar_url: e.target.value})}
                />
                <p className="text-gray-400 text-sm mt-2">
                  Paste a URL to your profile picture (JPG, PNG, GIF)
                </p>
              </div>
              
              {/* Avatar Preview */}
              {editProfileForm.avatar_url && (
                <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
                  <span className="text-gray-300">Preview:</span>
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                    <img 
                      src={editProfileForm.avatar_url} 
                      alt="Avatar preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm hidden">
                      {editProfileForm.username?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
