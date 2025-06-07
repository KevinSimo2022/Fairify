
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Key, 
  Smartphone,
  Save,
  AlertCircle
} from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSave = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Profile updated',
      description: 'Your profile information has been saved successfully.'
    });
    
    setIsLoading(false);
  };

  const handlePasswordChange = async () => {
    if (profileForm.newPassword !== profileForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'Password updated',
      description: 'Your password has been changed successfully.'
    });
    
    setProfileForm({
      ...profileForm,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    setIsLoading(false);
  };

  const handleTwoFactorToggle = async (enabled: boolean) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setTwoFactorEnabled(enabled);
    
    toast({
      title: enabled ? '2FA Enabled' : '2FA Disabled',
      description: enabled 
        ? 'Two-factor authentication has been enabled for your account.'
        : 'Two-factor authentication has been disabled.'
    });
    
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-roboto font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 font-open-sans">
          Manage your account preferences and security settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-roboto flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription className="font-open-sans">
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-maphera-blue text-white text-lg">
                    {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                  <p className="text-sm text-gray-500 mt-1 font-open-sans">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleProfileSave}
                  disabled={isLoading}
                  className="bg-maphera-blue hover:bg-blue-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-roboto flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Change Password
              </CardTitle>
              <CardDescription className="font-open-sans">
                Update your account password for security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handlePasswordChange}
                  disabled={isLoading || !profileForm.currentPassword || !profileForm.newPassword}
                  className="bg-maphera-green hover:bg-green-600"
                >
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-roboto flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription className="font-open-sans">
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium font-roboto">Enable 2FA</div>
                  <div className="text-sm text-gray-500 font-open-sans">
                    Require a verification code in addition to your password
                  </div>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handleTwoFactorToggle}
                  disabled={isLoading}
                />
              </div>

              {twoFactorEnabled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Smartphone className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">2FA is enabled</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Your account is protected with two-factor authentication.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-roboto">Active Sessions</CardTitle>
              <CardDescription className="font-open-sans">
                Manage your active login sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { device: 'Chrome on Windows', location: 'San Francisco, CA', lastActive: '2 minutes ago', current: true },
                  { device: 'Safari on iPhone', location: 'San Francisco, CA', lastActive: '2 hours ago', current: false },
                  { device: 'Firefox on macOS', location: 'New York, NY', lastActive: '1 day ago', current: false }
                ].map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium font-open-sans">{session.device}</p>
                      <p className="text-sm text-gray-500">{session.location} • {session.lastActive}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {session.current && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Current</span>
                      )}
                      {!session.current && (
                        <Button variant="outline" size="sm">Revoke</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-roboto flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="font-open-sans">
                Choose how you want to be notified about updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base font-medium font-roboto">Email Notifications</div>
                    <div className="text-sm text-gray-500 font-open-sans">
                      Receive updates about your analysis results via email
                    </div>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base font-medium font-roboto">Push Notifications</div>
                    <div className="text-sm text-gray-500 font-open-sans">
                      Get real-time notifications in your browser
                    </div>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base font-medium font-roboto">Security Alerts</div>
                    <div className="text-sm text-gray-500 font-open-sans">
                      Get notified about security-related activities
                    </div>
                  </div>
                  <Switch defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-base font-medium font-roboto">Analysis Complete</div>
                    <div className="text-sm text-gray-500 font-open-sans">
                      Notify when bias analysis is finished
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-roboto flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Appearance
              </CardTitle>
              <CardDescription className="font-open-sans">
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium font-roboto">Dark Mode</div>
                  <div className="text-sm text-gray-500 font-open-sans">
                    Switch to dark theme for better viewing in low light
                  </div>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-roboto">Data Privacy</CardTitle>
              <CardDescription className="font-open-sans">
                Control how your data is used and stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium font-roboto">Analytics Collection</div>
                  <div className="text-sm text-gray-500 font-open-sans">
                    Help us improve by sharing anonymous usage data
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-base font-medium font-roboto">Data Retention</div>
                  <div className="text-sm text-gray-500 font-open-sans">
                    Automatically delete old analysis results after 1 year
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="font-roboto text-red-600 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Danger Zone
              </CardTitle>
              <CardDescription className="font-open-sans">
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">
                Delete Account
              </Button>
              <p className="text-sm text-gray-500 mt-2 font-open-sans">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
