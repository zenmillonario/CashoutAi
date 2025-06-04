import React, { useState } from 'react';
import { Users, Crown, Shield, User, MoreVertical, Search } from 'lucide-react';

const UserManagement = ({ user, allUsers, onUpdateUserRole, onNotification }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = (userId, newRole) => {
    onUpdateUserRole(userId, newRole);
    setShowRoleModal(false);
    setSelectedUser(null);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'moderator':
        return <Shield className="w-5 h-5 text-blue-400" />;
      default:
        return <User className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'moderator':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-4">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-slate-400">Manage team members and roles</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Users Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((userItem) => (
            <div
              key={userItem.id}
              className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200"
            >
              {/* User Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <img
                    src={userItem.profilePic}
                    alt={userItem.name}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div>
                    <h3 className="text-white font-semibold">{userItem.name}</h3>
                    <p className="text-slate-400 text-sm">@{userItem.username}</p>
                  </div>
                </div>
                
                {user.id !== userItem.id && (
                  <button
                    onClick={() => {
                      setSelectedUser(userItem);
                      setShowRoleModal(true);
                    }}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* User Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Role</span>
                  <div className={`flex items-center px-2 py-1 rounded-full text-xs border ${getRoleBadgeColor(userItem.role)}`}>
                    {getRoleIcon(userItem.role)}
                    <span className="ml-1 capitalize">{userItem.role}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Status</span>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${userItem.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm text-slate-300">
                      {userItem.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Joined</span>
                  <span className="text-sm text-slate-300">
                    {new Date(userItem.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">
              Change Role for {selectedUser.name}
            </h3>
            
            <div className="space-y-3 mb-6">
              {['trader', 'moderator', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(selectedUser.id, role)}
                  className={`w-full flex items-center p-3 rounded-lg border transition-all ${
                    selectedUser.role === role
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50'
                  }`}
                >
                  {getRoleIcon(role)}
                  <div className="ml-3 text-left">
                    <div className="font-medium capitalize">{role}</div>
                    <div className="text-xs opacity-75">
                      {role === 'admin' && 'Full access to all features'}
                      {role === 'moderator' && 'Can moderate chat and manage users'}
                      {role === 'trader' && 'Standard trading access'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;