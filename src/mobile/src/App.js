import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import ChatDashboard from './components/ChatDashboard';
import Portfolio from './components/Portfolio';
import AdminPanel from './components/AdminPanel';
import Navigation from './components/Navigation';
import NotificationSystem from './components/NotificationSystem';
import axios from 'axios';
import './App.css';

// Backend API configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('cashoutai_user');
    const savedAuth = localStorage.getItem('cashoutai_auth');
    
    if (savedUser && savedAuth === 'true') {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.role === 'admin');
    }

    // Request notification permissions on mobile
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setIsAdmin(userData.role === 'admin');
    
    localStorage.setItem('cashoutai_user', JSON.stringify(userData));
    localStorage.setItem('cashoutai_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
    
    localStorage.removeItem('cashoutai_user');
    localStorage.removeItem('cashoutai_auth');
  };

  const addNotification = (notification) => {
    const id = Date.now();
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);

    // Play sound and vibrate on mobile
    playNotificationSound();
    vibrateDevice();
  };

  const playNotificationSound = () => {
    // Create audio context for mobile
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const vibrateDevice = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <NotificationSystem notifications={notifications} />
        
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route 
              path="/" 
              element={
                <ChatDashboard 
                  user={user} 
                  onNotification={addNotification}
                />
              } 
            />
            <Route 
              path="/portfolio" 
              element={<Portfolio user={user} />} 
            />
            {isAdmin && (
              <Route 
                path="/admin" 
                element={
                  <AdminPanel 
                    user={user} 
                    onNotification={addNotification}
                  />
                } 
              />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Navigation 
          isAdmin={isAdmin} 
          onLogout={handleLogout}
          currentUser={user}
        />
      </div>
    </Router>
  );
}

export default App;