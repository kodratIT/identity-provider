'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@/hooks/useUser'
import { useAuth } from '@/hooks/useAuth'
import { User, Building2, Bell, Lock, Save } from 'lucide-react'

export default function SettingsPage() {
  const { profile, activeTenant } = useUser()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    phone: '',
    bio: '',
  })

  const handleSaveProfile = async () => {
    setSaving(true)
    // TODO: Implement profile update
    setTimeout(() => setSaving(false), 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile Settings</CardTitle>
          </div>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile?.email || ''}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={profileData.full_name}
              onChange={(e) =>
                setProfileData({ ...profileData, full_name: e.target.value })
              }
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) =>
                setProfileData({ ...profileData, phone: e.target.value })
              }
              placeholder="+1234567890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              value={profileData.bio}
              onChange={(e) =>
                setProfileData({ ...profileData, bio: e.target.value })
              }
              placeholder="Tell us about yourself"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Tenant Info */}
      {activeTenant && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Current Tenant</CardTitle>
            </div>
            <CardDescription>
              Information about your active organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tenant Name</Label>
              <Input value={activeTenant.tenant_name} disabled className="bg-gray-50" />
            </div>

            <div className="space-y-2">
              <Label>Your Role</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{activeTenant.role_name}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>
            Manage your security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-gray-500">
                Update your account password
              </p>
            </div>
            <Button variant="outline">Change</Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">
                Add an extra layer of security
              </p>
            </div>
            <Button variant="outline">Enable</Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Active Sessions</p>
              <p className="text-sm text-gray-500">
                Manage your active sessions
              </p>
            </div>
            <Button variant="outline">View</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-gray-500">
                Receive email updates
              </p>
            </div>
            <Button variant="outline" size="sm">
              Enabled
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Security Alerts</p>
              <p className="text-sm text-gray-500">
                Get notified about security events
              </p>
            </div>
            <Button variant="outline" size="sm">
              Enabled
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
