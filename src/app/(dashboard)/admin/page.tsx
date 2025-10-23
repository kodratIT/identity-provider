'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Building2, 
  Key, 
  Activity, 
  Shield, 
  AlertTriangle,
  TrendingUp,
  Monitor,
  Lock,
} from 'lucide-react'

interface AdminStats {
  overview: {
    total_tenants: number
    active_tenants: number
    total_users: number
    active_users: number
    total_applications: number
    active_applications: number
    active_sessions: number
    active_tokens: number
  }
  activity_24h: {
    new_users: number
    new_tokens: number
    new_sessions: number
  }
  security: {
    failed_logins: number
    security_alerts: number
  }
  top_tenants: Array<{
    tenant_id: string
    name: string
    count: number
  }>
  top_applications: Array<{
    client_id: string
    name: string
    count: number
  }>
}

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/stats')
      
      if (response.status === 403) {
        setError('Super admin access required')
        setTimeout(() => router.push('/dashboard'), 2000)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load statistics')
      }

      const data = await response.json()
      setStats(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading super admin dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-semibold">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8 text-red-600" />
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Global overview of the entire system
          </p>
        </div>
      </div>

      {/* Security Alerts */}
      {(stats.security.failed_logins > 10 || stats.security.security_alerts > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900">Security Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.security.failed_logins > 10 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-800">
                  High number of failed login attempts
                </span>
                <Badge variant="destructive">{stats.security.failed_logins}</Badge>
              </div>
            )}
            {stats.security.security_alerts > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-800">
                  Suspicious activity detected
                </span>
                <Badge variant="destructive">{stats.security.security_alerts}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.total_tenants}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.active_tenants} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.total_users}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.active_users} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.total_applications}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.active_applications} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.active_sessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overview.active_tokens} tokens
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 24 Hour Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Last 24 Hours Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">New Users</p>
              <p className="text-2xl font-bold">{stats.activity_24h.new_users}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">New Sessions</p>
              <p className="text-2xl font-bold">{stats.activity_24h.new_sessions}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Tokens Issued</p>
              <p className="text-2xl font-bold">{stats.activity_24h.new_tokens}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Top Tenants by Users</CardTitle>
            <CardDescription>Schools with most active users</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.top_tenants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              <div className="space-y-3">
                {stats.top_tenants.map((tenant, index) => (
                  <div key={tenant.tenant_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tenant.count} users
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{tenant.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Top Applications by Usage</CardTitle>
            <CardDescription>Most used OAuth applications</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.top_applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              <div className="space-y-3">
                {stats.top_applications.map((app, index) => (
                  <div key={app.client_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-600">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{app.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.count} active tokens
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{app.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security Overview (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Failed Login Attempts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Monitor for potential attacks
                </p>
              </div>
              <Badge variant={stats.security.failed_logins > 10 ? 'destructive' : 'secondary'}>
                {stats.security.failed_logins}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Security Alerts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Suspicious activity detected
                </p>
              </div>
              <Badge variant={stats.security.security_alerts > 0 ? 'destructive' : 'secondary'}>
                {stats.security.security_alerts}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <button
              onClick={() => router.push('/tenants')}
              className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-left"
            >
              <Building2 className="h-5 w-5 mb-2 text-blue-600" />
              <p className="font-medium text-sm">Manage Tenants</p>
              <p className="text-xs text-muted-foreground">View all schools</p>
            </button>

            <button
              onClick={() => router.push('/users')}
              className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-left"
            >
              <Users className="h-5 w-5 mb-2 text-green-600" />
              <p className="font-medium text-sm">Manage Users</p>
              <p className="text-xs text-muted-foreground">Global user search</p>
            </button>

            <button
              onClick={() => router.push('/applications')}
              className="p-4 rounded-lg border hover:bg-gray-50 transition-colors text-left"
            >
              <Key className="h-5 w-5 mb-2 text-purple-600" />
              <p className="font-medium text-sm">Manage Applications</p>
              <p className="text-xs text-muted-foreground">OAuth clients</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
