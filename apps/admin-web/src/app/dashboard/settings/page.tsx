'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon,
  Building,
  User,
  Shield,
  Bell,
  Palette,
  Save,
  RefreshCw,
  Key,
  Globe,
  Zap,
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'organization' | 'profile' | 'security' | 'notifications'>('organization');

  // Fetch organization
  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organizationId],
    queryFn: () => user?.organizationId ? apiClient.getOrganization(user.organizationId) : null,
    enabled: !!user?.organizationId,
  });

  // Organization settings state
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [orgSlug, setOrgSlug] = useState(organization?.slug || '');
  const [primaryColor, setPrimaryColor] = useState(organization?.settings?.branding?.primaryColor || '#3b82f6');
  const [maxUsers, setMaxUsers] = useState(organization?.settings?.limits?.maxUsers || 1000);
  const [maxCourses, setMaxCourses] = useState(organization?.settings?.limits?.maxCourses || 100);
  const [aiGenerationEnabled, setAiGenerationEnabled] = useState(organization?.settings?.features?.aiGeneration ?? true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(organization?.settings?.features?.analytics ?? true);

  // User profile state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateOrganization(user!.organizationId, data),
    onSuccess: () => {
      toast.success('Organization settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update organization settings');
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateUser(user!.id, data),
    onSuccess: () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const handleSaveOrganization = () => {
    updateOrgMutation.mutate({
      name: orgName,
      slug: orgSlug,
      settings: {
        branding: {
          primaryColor,
        },
        features: {
          aiGeneration: aiGenerationEnabled,
          analytics: analyticsEnabled,
        },
        limits: {
          maxUsers: parseInt(maxUsers.toString()),
          maxCourses: parseInt(maxCourses.toString()),
        },
      },
    });
  };

  const handleSaveProfile = () => {
    updateUserMutation.mutate({
      firstName,
      lastName,
      email,
    });
  };

  const tabs = [
    { id: 'organization', label: 'Organization', icon: Building },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-gray-500 mt-1">Manage your organization and account settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>Update your organization information and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="ACME Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgSlug">Organization Slug</Label>
                  <Input
                    id="orgSlug"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    placeholder="acme-corp"
                  />
                  <p className="text-xs text-gray-500">Used in URLs and for identification</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveOrganization} disabled={updateOrgMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateOrgMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding
              </CardTitle>
              <CardDescription>Customize your organization's appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveOrganization} disabled={updateOrgMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Branding
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Features
              </CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">AI Content Generation</h4>
                  <p className="text-sm text-gray-500">
                    Allow users to generate lessons using AI from documents
                  </p>
                </div>
                <button
                  onClick={() => setAiGenerationEnabled(!aiGenerationEnabled)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${aiGenerationEnabled ? 'bg-primary' : 'bg-gray-200'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${aiGenerationEnabled ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Analytics Dashboard</h4>
                  <p className="text-sm text-gray-500">
                    Enable advanced analytics and reporting features
                  </p>
                </div>
                <button
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${analyticsEnabled ? 'bg-primary' : 'bg-gray-200'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${analyticsEnabled ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveOrganization} disabled={updateOrgMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Features
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Limits
              </CardTitle>
              <CardDescription>Configure organization resource limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Maximum Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCourses">Maximum Courses</Label>
                  <Input
                    id="maxCourses"
                    type="number"
                    value={maxCourses}
                    onChange={(e) => setMaxCourses(parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveOrganization} disabled={updateOrgMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Limits
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div>
                  <Badge variant="default">{user?.role.replace('_', ' ')}</Badge>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={updateUserMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Password
              </CardTitle>
              <CardDescription>Change your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <div className="flex justify-end">
                <Button>
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sessions
              </CardTitle>
              <CardDescription>Manage your active sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Current Session</h4>
                    <p className="text-sm text-gray-500">Active now</p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>Configure your email notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Course Enrollments</h4>
                  <p className="text-sm text-gray-500">Get notified when users enroll in courses</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">AI Generation Complete</h4>
                  <p className="text-sm text-gray-500">
                    Get notified when AI lesson generation is complete
                  </p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Weekly Reports</h4>
                  <p className="text-sm text-gray-500">Receive weekly analytics reports</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
