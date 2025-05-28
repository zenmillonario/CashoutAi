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
          const message = JSON.parse(event.data);
          if (message.content && message.username) {
            setMessages(prev => [...prev, message]);
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

  // Load messages on login
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
      let response;
      if (isRegistering) {
        response = await axios.post(`${API}/users/register`, loginForm);
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

      {/* Main Chat Area */}
      <div className="max-w-6xl mx-auto p-4 h-[calc(100vh-80px)] flex flex-col">
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
    </div>
  );
}

export default App;
