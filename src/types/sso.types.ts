// SSO Session Management Types

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface SSOSession {
  id: string
  session_token: string
  user_id: string
  tenant_id: string
  ip_address: string | null
  user_agent: string | null
  device_type: DeviceType
  device_name: string | null
  remember_me: boolean
  expires_at: string
  last_activity_at: string
  created_at: string
}

export interface SSOConnectedApp {
  id: string
  sso_session_id: string
  client_id: string
  app_session_token: string | null
  logout_url: string | null
  connected_at: string
  last_seen_at: string
}

export interface SSOSessionActivity {
  id: string
  sso_session_id: string
  activity_type: ActivityType
  client_id: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any>
  created_at: string
}

export type ActivityType =
  | 'login'
  | 'logout'
  | 'app_connect'
  | 'app_disconnect'
  | 'token_refresh'
  | 'session_expired'
  | 'forced_logout'
  | 'password_changed'
  | 'suspicious_activity'

// Request/Response Types

export interface CreateSSOSessionRequest {
  user_id: string
  tenant_id: string
  ip_address?: string
  user_agent?: string
  remember_me?: boolean
  device_info?: DeviceInfo
}

export interface CreateSSOSessionResponse {
  session: SSOSession
  session_token: string
}

export interface DeviceInfo {
  type: DeviceType
  name: string // Browser name or device name
  os?: string
  browser?: string
  browser_version?: string
}

export interface ConnectAppRequest {
  session_token: string
  client_id: string
  app_session_token?: string
  logout_url?: string
}

export interface SingleLogoutRequest {
  session_token: string
  notify_apps?: boolean // If true, notify all connected apps
}

export interface SingleLogoutResponse {
  success: boolean
  apps_notified: string[] // List of client_ids notified
  errors?: Array<{
    client_id: string
    error: string
  }>
}

export interface SessionWithDetails extends SSOSession {
  user: {
    id: string
    email: string
    full_name: string | null
  }
  tenant: {
    id: string
    name: string
  }
  connected_apps: Array<{
    client_id: string
    name: string
    logo_url: string | null
    connected_at: string
    last_seen_at: string
  }>
  activity_count: number
}

export interface ActiveSessionsSummary {
  user_id: string
  full_name: string | null
  active_sessions: number
  connected_apps: number
  last_activity: string
  tenant_name: string
}

export interface SessionStats {
  date: string
  sessions_created: number
  unique_users: number
  remember_me_sessions: number
  avg_session_duration_seconds: number
}

// Helper Types

export interface UserAgentInfo {
  browser: string
  browserVersion: string
  os: string
  device: DeviceType
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export interface SessionValidationResult {
  valid: boolean
  session?: SSOSession
  error?: string
}

export interface SessionActivityLog {
  activity_type: ActivityType
  client_id?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, any>
}

// Configuration Types

export interface SSOSessionConfig {
  // Session duration in seconds
  default_expiration: number // 24 hours
  remember_me_expiration: number // 30 days
  
  // Activity tracking
  activity_timeout: number // 30 minutes - if no activity, consider session idle
  
  // Security
  max_sessions_per_user: number // Maximum concurrent sessions per user
  force_single_session: boolean // If true, new login invalidates old sessions
  
  // Device tracking
  track_devices: boolean
  max_devices_per_user: number
  
  // Cleanup
  cleanup_expired_after_days: number // Delete expired sessions after X days
  cleanup_inactive_after_days: number // Delete inactive sessions after X days
}

export const DEFAULT_SSO_CONFIG: SSOSessionConfig = {
  default_expiration: 86400, // 24 hours
  remember_me_expiration: 2592000, // 30 days
  activity_timeout: 1800, // 30 minutes
  max_sessions_per_user: 5,
  force_single_session: false,
  track_devices: true,
  max_devices_per_user: 10,
  cleanup_expired_after_days: 7,
  cleanup_inactive_after_days: 30,
}
