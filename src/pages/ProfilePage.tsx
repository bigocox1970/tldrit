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
  const [plan, setPlan] = useState('');
  const [tldrUsage, setTldrUsage] = useState({ used: 0, limit: 0 });
  const [ttsUsage, setTtsUsage] = useState({ used: 0, limit: 0 });
  const [tldrCharactersUsage, setTldrCharactersUsage] = useState({ used: 0, limit: 0 });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      // Get profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, full_name, eli5_age, plan')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUsername(profileData.username || '');
        setFullName(profileData.full_name || '');
        setEli5Age(profileData.eli5_age ?? 5);
        setPlan(profileData.plan || 'free');

        // Count TLDRs this month from summaries table
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: tldrCount } = await supabase
          .from('summaries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        // Get all summaries this month to calculate character usage
        const { data: monthlySummaries } = await supabase
          .from('summaries')
          .select('summary')
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        // Calculate TTS usage from summaries with audio
        const { data: audioSummaries } = await supabase
          .from('summaries')
          .select('summary')
          .eq('user_id', user.id)
          .not('audio_url', 'is', null)
          .gte('created_at', startOfMonth.toISOString());

        const ttsCharactersUsed = audioSummaries?.reduce((total, summary) => {
          return total + (summary.summary?.length || 0);
        }, 0) || 0;

        // Calculate total TLDR characters this month
        const tldrCharactersUsed = monthlySummaries?.reduce((total, summary) => {
          return total + (summary.summary?.length || 0);
        }, 0) || 0;

        // Set plan limits
        const planLimits = {
          free: { tldrs: 10, ttsCharacters: 0, tldrCharacters: 50000 },
          pro: { tldrs: 100, ttsCharacters: 100000, tldrCharacters: 500000 },
          premium: { tldrs: Infinity, ttsCharacters: Infinity, tldrCharacters: Infinity }
        };

        const currentPlanLimits = planLimits[profileData.plan as keyof typeof planLimits] || planLimits.free;

        setTldrUsage({
          used: tldrCount || 0,
          limit: currentPlanLimits.tldrs
        });

        setTtsUsage({
          used: ttsCharactersUsed,
          limit: currentPlanLimits.ttsCharacters
        });

        setTldrCharactersUsage({
          used: tldrCharactersUsed,
          limit: currentPlanLimits.tldrCharacters
        });
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
            Current Plan: <span className="font-medium">{plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Free'}</span>
          </p>

          {plan !== 'free' && (
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-medium mb-2">TLDRs This Month</h3>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>TLDRs Created</span>
                    <span>{tldrUsage.used.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.min((tldrUsage.used / (tldrUsage.limit || 1)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0</span>
                    <span>{tldrUsage.limit === Infinity ? 'Unlimited' : tldrUsage.limit.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">TLDR Characters This Month</h3>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Characters in TLDRs</span>
                    <span>{tldrCharactersUsage.used.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.min((tldrCharactersUsage.used / (tldrCharactersUsage.limit || 1)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0</span>
                    <span>{tldrCharactersUsage.limit === Infinity ? 'Unlimited' : tldrCharactersUsage.limit.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Text-to-Speech Usage</h3>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Characters Used</span>
                    <span>{ttsUsage.used.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.min((ttsUsage.used / (ttsUsage.limit || 1)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0</span>
                    <span>{ttsUsage.limit === Infinity ? 'Unlimited' : ttsUsage.limit.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {plan === 'free' && (
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-medium mb-2">TLDRs This Month</h3>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>TLDRs Created</span>
                    <span>{tldrUsage.used.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.min((tldrUsage.used / (tldrUsage.limit || 1)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0</span>
                    <span>{tldrUsage.limit.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">TLDR Characters This Month</h3>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Characters in TLDRs</span>
                    <span>{tldrCharactersUsage.used.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.min((tldrCharactersUsage.used / (tldrCharactersUsage.limit || 1)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0</span>
                    <span>{tldrCharactersUsage.limit === Infinity ? 'Unlimited' : tldrCharactersUsage.limit.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={() => navigate('/pricing')}
          >
            {plan === 'pro' ? 'Manage Subscription' : 'Upgrade to Pro'}
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