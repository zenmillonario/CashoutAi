import React, { useState } from 'react';
import { User, Camera, Save, Shield } from 'lucide-react';

const ProfileSettings = ({ user, onUpdateProfile }) => {
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    profilePic: user?.profilePic || '',
    bio: user?.bio || 'Trading team member',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateNewAvatar = () => {
    const colors = ['3b82f6', 'ef4444', '10b981', 'f59e0b', '8b5cf6', 'ec4899', '06b6d4', 'f97316', '84cc16', 'f43f5e'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const name = profileData.name || user?.name || 'User';
    const newPicUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${randomColor}&color=fff&size=128`;
    
    handleInputChange('profilePic', newPicUrl);
    setMessage('✅ New avatar generated! Click Save to apply changes.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onUpdateProfile && user?.id) {
        onUpdateProfile(user.id, profileData);
        setMessage('✅ Profile updated successfully!');
      } else {
        setMessage('✅ Changes saved locally!');
      }
      
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      setMessage('❌ Failed to update profile. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { text: 'Administrator', color: 'text-yellow-400' };
      case 'moderator':
        return { text: 'Moderator', color: 'text-blue-400' };
      default:
        return { text: 'Trader', color: 'text-green-400' };
    }
  };

  const roleInfo = getRoleInfo(user?.role);

  return (
    <div className="flex flex-col h-full bg-slate-900 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-slate-400">Manage your account information</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full">
        {/* Success/Error Message */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 ${
            message.includes('✅') 
              ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 mb-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-4">Profile Picture</h2>
          
          <div className="flex items-center space-x-6">
            <div className="relative">
              <img
                src={profileData.profilePic}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-slate-600"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name || 'User')}&background=6b7280&color=fff`;
                }}
              />
              <button
                onClick={generateNewAvatar}
                type="button"
                className="absolute -bottom-2 -right-2 bg-blue-500 hover:bg-blue-600 rounded-full p-2 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">{profileData.name || 'No Name'}</h3>
              <p className="text-slate-400 text-sm mb-3">@{profileData.username || 'username'}</p>
              <button
                onClick={generateNewAvatar}
                type="button"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
              >
                Generate New Avatar
              </button>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 mb-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Enter your display name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={profileData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Bio
              </label>
              <textarea
                value={profileData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows="3"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 mb-6 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-4">Account Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Role</span>
              <div className={`flex items-center ${roleInfo.color}`}>
                <Shield className="w-4 h-4 mr-2" />
                <span className="font-medium">{roleInfo.text}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Member Since</span>
              <span className="text-slate-400">
                {user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Account Status</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-400 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleSave}
            disabled={isLoading}
            type="button"
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;