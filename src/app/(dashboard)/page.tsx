'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, Shield, Activity, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'

interface DashboardStats {
  totalUsers: number
  activeTenants: number
  totalRoles: number
  activeSessions: number
}

interface RecentActivity {
  id: string
  action: string
  user_name: string
  created_at: string
  resource: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { activeTenant, profile } = useUser()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeTenants: 0,
    totalRoles: 0,
    activeSessions: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!activeTenant) return
    loadDashboardData()
  }, [activeTenant])

  async function loadDashboardData() {
    try {
      // Get total users for this tenant
      const { count: usersCount } = await supabase
        .from('user_tenants')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', activeTenant!.tenant_id)
        .eq('is_active', true)

      // Get all tenants user belongs to
      const { data: tenantsData } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user!.id)
        .eq('is_active', true)

      // Get total roles for this tenant
      const { count: rolesCount } = await supabase
        .from('roles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', activeTenant!.tenant_id)

      // Get recent audit logs
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', activeTenant!.tenant_id)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalUsers: usersCount || 0,
        activeTenants: tenantsData?.length || 0,
        totalRoles: rolesCount || 0,
        activeSessions: usersCount || 0, // Simplified
      })

      setRecentActivity(auditData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <h1 className="text-3xl font-bold">
          {getGreeting()}, {profile?.full_name || 'User'}!
        </h1>
        <p className="mt-2 text-blue-100">
          Welcome to {activeTenant?.tenant_name}. Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              in {activeTenant?.tenant_name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTenants}</div>
            <p className="text-xs text-gray-500">
              organizations you belong to
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoles}</div>
            <p className="text-xs text-gray-500">
              defined in this tenant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {activeTenant?.role_name.replace('_', ' ')}
            </div>
            <p className="text-xs text-gray-500">
              current access level
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-500">
                        {activity.resource} • {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/dashboard/users"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Manage Users</p>
                <p className="text-xs text-gray-500">View and edit user accounts</p>
              </div>
            </a>

            <a
              href="/dashboard/tenants"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Manage Tenants</p>
                <p className="text-xs text-gray-500">Configure organizations</p>
              </div>
            </a>

            <a
              href="/dashboard/roles"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Roles & Permissions</p>
                <p className="text-xs text-gray-500">Control access levels</p>
              </div>
            </a>

            <a
              href="/dashboard/settings"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Settings</p>
                <p className="text-xs text-gray-500">Configure your preferences</p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
