import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { supabase } from '../lib/supabase';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [eli5Age, setEli5Age] = useState(user?.eli5Age ?? 5);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('username, full_name, eli5_age')
        .eq('id', user.id)
        .single();

      if (data) {
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setEli5Age(data.eli5_age ?? 5);
      }
    };

    loadProfile();
  }, [user]);

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          full_name: fullName,
          eli5_age: eli5Age,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      setSuccess('Profile updated successfully');
    } catch {
      setSuccess('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setSuccess('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* <h1 className="text-2xl font-bold">Profile Settings</h1> */}

      {success && (
        <div className="p-4 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Account Information</h2>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              label="Email"
              value={user?.email || ''}
              disabled
              type="email"
              onChange={() => {}}
            />
            
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
            />
            
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
            
            <div>
              <label className="block text-sm font-medium mb-1">Preferred ELI Age</label>
              <select
                className="w-full border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                value={eli5Age}
                onChange={e => setEli5Age(Number(e.target.value))}
              >
                <option className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100" value={5}>5 (Very simple)</option>
                <option className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100" value={10}>10 (Moderately simple)</option>
                <option className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100" value={15}>15 (More advanced)</option>
              </select>
            </div>
            
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Change Password</h2>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              type="password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            
            <Input
              type="password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Subscription</h2>
        </CardHeader>
        
        <CardContent>
          <p className="mb-4">
            Current Plan: <span className="font-medium">{user?.isPremium ? 'Pro' : 'Free'}</span>
          </p>
          
          <Button
            variant="outline"
            onClick={() => navigate('/profile/subscription')}
          >
            {user?.isPremium ? 'Manage Subscription' : 'Upgrade to Pro'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Account Actions</h2>
        </CardHeader>
        
        <CardContent>
          <Button
            variant="outline"
            onClick={() => logout().then(() => navigate('/login'))}
            className="text-red-600 hover:bg-red-50"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;