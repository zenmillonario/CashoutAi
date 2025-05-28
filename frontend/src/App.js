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
  const [tradeForm, setTradeForm] = useState({
    symbol: '',
    action: 'BUY',
    quantity: '',
    price: '',
    notes: ''
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
      const ws = new WebSocket(`${BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/ws/${currentUser.id}`);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message') {
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
          console.log('WebSocket message:', event.data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
      };

      wsRef.current = ws;
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
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
      loadUserPerformance();
      if (currentUser.is_admin) {
        loadPendingUsers();
      }
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
        alert('Registration successful! Please wait for admin approval.');
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
      
      loadUserTrades();
      loadUserPerformance();
      alert('Trade recorded successfully!');
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
            <h1 className="text-4xl font-bold text-white mb-2">CashOutAi</h1>
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
            <h1 className="text-2xl font-bold text-white">CashOutAi</h1>
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
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {message.username.charAt(0).toUpperCase()}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Trade Form */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Paper Trading</h2>
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
              <h2 className="text-2xl font-bold text-white mb-6">Recent Trades</h2>
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
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && userPerformance && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Trading Performance</h2>
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
    </div>
  );
}

export default App;
