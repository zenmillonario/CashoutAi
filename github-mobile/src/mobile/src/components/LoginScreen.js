import React, { useState } from 'react';
import { Shield, Smartphone } from 'lucide-react';

const LoginScreen = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check credentials
      if (credentials.username === 'admin' && credentials.password === 'admin123') {
        onLogin({
          id: 'admin_001',
          username: 'admin',
          role: 'admin',
          name: 'Admin User',
          joinedAt: new Date().toISOString()
        });
      } else if (credentials.username && credentials.password) {
        onLogin({
          id: `user_${Date.now()}`,
          username: credentials.username,
          role: 'trader',
          name: credentials.username,
          joinedAt: new Date().toISOString()
        });
      } else {
        setError('Please enter valid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CashOutAI</h1>
          <p className="text-slate-400">Mobile Trading Chat</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="mobile-input"
                  placeholder="Enter username"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="mobile-input"
                  placeholder="Enter password"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !credentials.username || !credentials.password}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-4 rounded-xl touch-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="loading-spinner mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Sign In
                  </div>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Demo Credentials:</h3>
          <div className="space-y-1 text-xs text-slate-400">
            <p><strong>Admin:</strong> admin / admin123</p>
            <p><strong>Trader:</strong> Any username / Any password</p>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Team Chat
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            Live Trading
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            Push Notifications
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
            Portfolio Tracking
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;