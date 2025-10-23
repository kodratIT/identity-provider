import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSuperAdmin } from '@/lib/auth/super-admin'

// GET /api/admin/stats - Global statistics for super admin
export async function GET(request: NextRequest) {
  try {
    // Check super admin access
    if (!await isSuperAdmin()) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Total tenants
    const { count: totalTenants } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })

    const { count: activeTenants } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    // Total users (from auth.users)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    const totalUsers = users?.length || 0

    // Active users (with at least one tenant association)
    const { count: activeUsers } = await supabase
      .from('user_tenants')
      .select('user_id', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get unique active users
    const { data: uniqueActiveUsers } = await supabase
      .from('user_tenants')
      .select('user_id')
      .eq('is_active', true)

    const uniqueActiveUserCount = uniqueActiveUsers 
      ? new Set(uniqueActiveUsers.map(u => u.user_id)).size 
      : 0

    // Total OAuth applications
    const { count: totalApplications } = await supabase
      .from('oauth_clients')
      .select('id', { count: 'exact', head: true })

    const { count: activeApplications } = await supabase
      .from('oauth_clients')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    // Active SSO sessions
    const { count: activeSessions } = await supabase
      .from('sso_sessions')
      .select('id', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString())

    // Active OAuth tokens
    const { count: activeTokens } = await supabase
      .from('oauth_access_tokens')
      .select('id', { count: 'exact', head: true })
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())

    // Recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { count: newUsers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)

    const { count: newTokens } = await supabase
      .from('oauth_access_tokens')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)

    const { count: newSessions } = await supabase
      .from('sso_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)

    // Failed login attempts (last 24 hours)
    const { count: failedLogins } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'login_failed')
      .gte('created_at', oneDayAgo)

    // Security alerts
    const { count: securityAlerts } = await supabase
      .from('sso_session_activity')
      .select('id', { count: 'exact', head: true })
      .eq('activity_type', 'suspicious_activity')
      .gte('created_at', oneDayAgo)

    // Top tenants by user count
    const { data: topTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, tenant:tenants(name)')
      .eq('is_active', true)

    const tenantUserCounts: Record<string, { name: string; count: number }> = {}
    topTenants?.forEach((ut: any) => {
      const tenantId = ut.tenant_id
      if (!tenantUserCounts[tenantId]) {
        tenantUserCounts[tenantId] = {
          name: ut.tenant.name,
          count: 0,
        }
      }
      tenantUserCounts[tenantId].count++
    })

    const topTenantsArray = Object.entries(tenantUserCounts)
      .map(([id, data]) => ({ tenant_id: id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Top applications by usage
    const { data: appUsage } = await supabase
      .from('oauth_access_tokens')
      .select('client_id, oauth_client:oauth_clients(name)')
      .is('revoked_at', null)

    const appUsageCounts: Record<string, { name: string; count: number }> = {}
    appUsage?.forEach((token: any) => {
      const clientId = token.client_id
      if (!appUsageCounts[clientId]) {
        appUsageCounts[clientId] = {
          name: token.oauth_client.name,
          count: 0,
        }
      }
      appUsageCounts[clientId].count++
    })

    const topAppsArray = Object.entries(appUsageCounts)
      .map(([id, data]) => ({ client_id: id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return NextResponse.json({
      overview: {
        total_tenants: totalTenants || 0,
        active_tenants: activeTenants || 0,
        total_users: totalUsers,
        active_users: uniqueActiveUserCount,
        total_applications: totalApplications || 0,
        active_applications: activeApplications || 0,
        active_sessions: activeSessions || 0,
        active_tokens: activeTokens || 0,
      },
      activity_24h: {
        new_users: newUsers || 0,
        new_tokens: newTokens || 0,
        new_sessions: newSessions || 0,
      },
      security: {
        failed_logins: failedLogins || 0,
        security_alerts: securityAlerts || 0,
      },
      top_tenants: topTenantsArray,
      top_applications: topAppsArray,
    })
    
  } catch (error) {
    console.error('Get admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    )
  }
}
