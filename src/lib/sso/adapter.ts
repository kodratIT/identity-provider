import { createClient } from '@/lib/supabase/server'
import type {
  SSOSession,
  SSOConnectedApp,
  SSOSessionActivity,
  SessionWithDetails,
  CreateSSOSessionRequest,
  ActivityType,
  SessionActivityLog,
} from '@/types/sso.types'
import {
  generateSSOSessionToken,
  calculateSessionExpiration,
  createDeviceInfo,
} from './utils'

// ============================================================================
// SSO Sessions
// ============================================================================

export async function createSSOSession(
  request: CreateSSOSessionRequest
): Promise<{ session: SSOSession; session_token: string }> {
  const supabase = await createClient()
  
  const sessionToken = generateSSOSessionToken()
  const deviceInfo = createDeviceInfo(request.user_agent || null)
  const expiresAt = calculateSessionExpiration(request.remember_me || false)

  const { data, error } = await supabase
    .from('sso_sessions')
    .insert({
      session_token: sessionToken,
      user_id: request.user_id,
      tenant_id: request.tenant_id,
      ip_address: request.ip_address || null,
      user_agent: request.user_agent || null,
      device_type: deviceInfo.type,
      device_name: deviceInfo.name,
      remember_me: request.remember_me || false,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create SSO session: ${error.message}`)
  }

  // Log the login activity
  await logSessionActivity({
    sso_session_id: data.id,
    activity_type: 'login',
    ip_address: request.ip_address,
    user_agent: request.user_agent,
    metadata: {
      device: deviceInfo,
      remember_me: request.remember_me || false,
    },
  })

  return {
    session: data as SSOSession,
    session_token: sessionToken,
  }
}

export async function getSSOSession(sessionToken: string): Promise<SSOSession | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sso_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .single()

  if (error || !data) {
    return null
  }

  return data as SSOSession
}

export async function getSSOSessionById(sessionId: string): Promise<SSOSession | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sso_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !data) {
    return null
  }

  return data as SSOSession
}

export async function getSessionWithDetails(sessionToken: string): Promise<SessionWithDetails | null> {
  const supabase = await createClient()
  
  const { data: session, error: sessionError } = await supabase
    .from('sso_sessions')
    .select(`
      *,
      user:profiles!sso_sessions_user_id_fkey(id, full_name),
      tenant:tenants(id, name)
    `)
    .eq('session_token', sessionToken)
    .single()

  if (sessionError || !session) {
    return null
  }

  // Get connected apps
  const { data: connectedApps } = await supabase
    .from('sso_connected_apps')
    .select(`
      client_id,
      connected_at,
      last_seen_at,
      oauth_client:oauth_clients(name, logo_url)
    `)
    .eq('sso_session_id', session.id)

  // Get activity count
  const { count: activityCount } = await supabase
    .from('sso_session_activity')
    .select('id', { count: 'exact', head: true })
    .eq('sso_session_id', session.id)

  // Get user email from auth
  const { data: { user: authUser } } = await supabase.auth.getUser()

  return {
    ...session,
    user: {
      id: session.user.id,
      email: authUser?.email || '',
      full_name: session.user.full_name,
    },
    tenant: session.tenant,
    connected_apps: (connectedApps || []).map((app: any) => ({
      client_id: app.client_id,
      name: app.oauth_client.name,
      logo_url: app.oauth_client.logo_url,
      connected_at: app.connected_at,
      last_seen_at: app.last_seen_at,
    })),
    activity_count: activityCount || 0,
  } as SessionWithDetails
}

export async function updateSessionActivity(sessionToken: string): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('sso_sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('session_token', sessionToken)
}

export async function revokeSSOSession(sessionToken: string): Promise<void> {
  const supabase = await createClient()
  
  // Set expiration to now (effectively revoking the session)
  await supabase
    .from('sso_sessions')
    .update({ expires_at: new Date().toISOString() })
    .eq('session_token', sessionToken)
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const supabase = await createClient()
  
  // Get all active sessions for logging
  const { data: sessions } = await supabase
    .from('sso_sessions')
    .select('id')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())

  if (sessions && sessions.length > 0) {
    // Revoke all sessions
    await supabase
      .from('sso_sessions')
      .update({ expires_at: new Date().toISOString() })
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())

    // Log forced logout for each session
    for (const session of sessions) {
      await logSessionActivity({
        sso_session_id: session.id,
        activity_type: 'forced_logout',
        metadata: { reason: 'all_sessions_revoked' },
      })
    }
  }
}

export async function getUserActiveSessions(userId: string): Promise<SSOSession[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sso_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('last_activity_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get user sessions: ${error.message}`)
  }

  return data as SSOSession[]
}

export async function cleanupExpiredSessions(): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('sso_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
}

// ============================================================================
// Connected Apps
// ============================================================================

export async function connectApp(
  sessionToken: string,
  clientId: string,
  appSessionToken?: string,
  logoutUrl?: string
): Promise<SSOConnectedApp> {
  const supabase = await createClient()
  
  // Get session ID
  const session = await getSSOSession(sessionToken)
  if (!session) {
    throw new Error('SSO session not found')
  }

  // Check if app is already connected
  const { data: existing } = await supabase
    .from('sso_connected_apps')
    .select('*')
    .eq('sso_session_id', session.id)
    .eq('client_id', clientId)
    .single()

  if (existing) {
    // Update last_seen_at
    const { data, error } = await supabase
      .from('sso_connected_apps')
      .update({
        last_seen_at: new Date().toISOString(),
        app_session_token: appSessionToken || existing.app_session_token,
        logout_url: logoutUrl || existing.logout_url,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update connected app: ${error.message}`)
    }

    return data as SSOConnectedApp
  }

  // Create new connection
  const { data, error } = await supabase
    .from('sso_connected_apps')
    .insert({
      sso_session_id: session.id,
      client_id: clientId,
      app_session_token: appSessionToken || null,
      logout_url: logoutUrl || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to connect app: ${error.message}`)
  }

  // Log the activity
  await logSessionActivity({
    sso_session_id: session.id,
    activity_type: 'app_connect',
    client_id: clientId,
    metadata: { logout_url: logoutUrl },
  })

  return data as SSOConnectedApp
}

export async function disconnectApp(
  sessionToken: string,
  clientId: string
): Promise<void> {
  const supabase = await createClient()
  
  const session = await getSSOSession(sessionToken)
  if (!session) {
    return
  }

  await supabase
    .from('sso_connected_apps')
    .delete()
    .eq('sso_session_id', session.id)
    .eq('client_id', clientId)

  // Log the activity
  await logSessionActivity({
    sso_session_id: session.id,
    activity_type: 'app_disconnect',
    client_id: clientId,
  })
}

export async function getConnectedApps(sessionToken: string): Promise<SSOConnectedApp[]> {
  const supabase = await createClient()
  
  const session = await getSSOSession(sessionToken)
  if (!session) {
    return []
  }

  const { data, error } = await supabase
    .from('sso_connected_apps')
    .select('*')
    .eq('sso_session_id', session.id)
    .order('last_seen_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get connected apps: ${error.message}`)
  }

  return data as SSOConnectedApp[]
}

export async function getConnectedAppsWithDetails(sessionToken: string) {
  const supabase = await createClient()
  
  const session = await getSSOSession(sessionToken)
  if (!session) {
    return []
  }

  const { data, error } = await supabase
    .from('sso_connected_apps')
    .select(`
      *,
      oauth_client:oauth_clients(name, logo_url, homepage_url)
    `)
    .eq('sso_session_id', session.id)
    .order('last_seen_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get connected apps: ${error.message}`)
  }

  return data.map((app: any) => ({
    ...app,
    client_name: app.oauth_client.name,
    client_logo: app.oauth_client.logo_url,
    client_homepage: app.oauth_client.homepage_url,
  }))
}

// ============================================================================
// Session Activity Logging
// ============================================================================

export async function logSessionActivity(log: {
  sso_session_id: string
  activity_type: ActivityType
  client_id?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, any>
}): Promise<SSOSessionActivity> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sso_session_activity')
    .insert({
      sso_session_id: log.sso_session_id,
      activity_type: log.activity_type,
      client_id: log.client_id || null,
      ip_address: log.ip_address || null,
      user_agent: log.user_agent || null,
      metadata: log.metadata || {},
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to log session activity:', error)
    throw new Error(`Failed to log session activity: ${error.message}`)
  }

  return data as SSOSessionActivity
}

export async function getSessionActivity(
  sessionToken: string,
  limit: number = 50
): Promise<SSOSessionActivity[]> {
  const supabase = await createClient()
  
  const session = await getSSOSession(sessionToken)
  if (!session) {
    return []
  }

  const { data, error } = await supabase
    .from('sso_session_activity')
    .select('*')
    .eq('sso_session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get session activity: ${error.message}`)
  }

  return data as SSOSessionActivity[]
}

// ============================================================================
// Statistics and Monitoring
// ============================================================================

export async function getActiveSessionCount(userId: string): Promise<number> {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('sso_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())

  if (error) {
    console.error('Failed to get active session count:', error)
    return 0
  }

  return count || 0
}

export async function getTotalConnectedApps(userId: string): Promise<number> {
  const supabase = await createClient()
  
  // Get all active sessions for user
  const { data: sessions } = await supabase
    .from('sso_sessions')
    .select('id')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())

  if (!sessions || sessions.length === 0) {
    return 0
  }

  const sessionIds = sessions.map(s => s.id)

  // Count unique connected apps
  const { data: apps } = await supabase
    .from('sso_connected_apps')
    .select('client_id')
    .in('sso_session_id', sessionIds)

  if (!apps) {
    return 0
  }

  // Get unique client IDs
  const uniqueClients = new Set(apps.map(a => a.client_id))
  return uniqueClients.size
}
