import { nanoid } from 'nanoid'
import type { DeviceType, UserAgentInfo, DeviceInfo } from '@/types/sso.types'

// Generate SSO session token
export function generateSSOSessionToken(): string {
  return `sso_${nanoid(48)}`
}

// Parse User-Agent string to extract device information
export function parseUserAgent(userAgent: string): UserAgentInfo {
  const ua = userAgent.toLowerCase()

  // Detect browser
  let browser = 'Unknown'
  let browserVersion = ''
  
  if (ua.includes('firefox/')) {
    browser = 'Firefox'
    browserVersion = extractVersion(ua, 'firefox/')
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Chrome'
    browserVersion = extractVersion(ua, 'chrome/')
  } else if (ua.includes('safari/') && !ua.includes('chrome')) {
    browser = 'Safari'
    browserVersion = extractVersion(ua, 'version/')
  } else if (ua.includes('edg/')) {
    browser = 'Edge'
    browserVersion = extractVersion(ua, 'edg/')
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browser = 'Opera'
    browserVersion = extractVersion(ua, ua.includes('opr/') ? 'opr/' : 'opera/')
  }

  // Detect OS
  let os = 'Unknown'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac os x')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

  // Detect device type
  const isMobile = /mobile|android|iphone/i.test(ua)
  const isTablet = /ipad|tablet/i.test(ua)
  const isDesktop = !isMobile && !isTablet

  let device: DeviceType = 'unknown'
  if (isDesktop) device = 'desktop'
  else if (isTablet) device = 'tablet'
  else if (isMobile) device = 'mobile'

  return {
    browser,
    browserVersion,
    os,
    device,
    isMobile,
    isTablet,
    isDesktop,
  }
}

// Extract version from user agent string
function extractVersion(ua: string, prefix: string): string {
  const index = ua.indexOf(prefix)
  if (index === -1) return ''
  
  const versionStart = index + prefix.length
  const versionEnd = ua.indexOf(' ', versionStart)
  const version = versionEnd === -1 
    ? ua.substring(versionStart) 
    : ua.substring(versionStart, versionEnd)
  
  return version.split('.')[0] // Return major version only
}

// Create device info from user agent
export function createDeviceInfo(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return {
      type: 'unknown',
      name: 'Unknown Device',
    }
  }

  const parsed = parseUserAgent(userAgent)
  
  return {
    type: parsed.device,
    name: `${parsed.browser} on ${parsed.os}`,
    os: parsed.os,
    browser: parsed.browser,
    browser_version: parsed.browserVersion,
  }
}

// Calculate session expiration
export function calculateSessionExpiration(
  rememberMe: boolean,
  defaultExpiration: number = 86400, // 24 hours
  rememberMeExpiration: number = 2592000 // 30 days
): Date {
  const expirationSeconds = rememberMe ? rememberMeExpiration : defaultExpiration
  return new Date(Date.now() + expirationSeconds * 1000)
}

// Check if session is expired
export function isSessionExpired(expiresAt: Date | string): boolean {
  const expirationDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return expirationDate.getTime() < Date.now()
}

// Check if session is idle (no activity for X minutes)
export function isSessionIdle(
  lastActivityAt: Date | string,
  timeoutMinutes: number = 30
): boolean {
  const lastActivity = typeof lastActivityAt === 'string' 
    ? new Date(lastActivityAt) 
    : lastActivityAt
  
  const idleThreshold = Date.now() - (timeoutMinutes * 60 * 1000)
  return lastActivity.getTime() < idleThreshold
}

// Get client IP from request headers (handles proxies)
export function getClientIP(headers: Headers): string | null {
  // Check various proxy headers
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback (less reliable)
  return headers.get('remote-addr') || null
}

// Extract device fingerprint for additional security
export function generateDeviceFingerprint(
  userAgent: string | null,
  ip: string | null
): string {
  const data = `${userAgent || 'unknown'}:${ip || 'unknown'}`
  // Simple hash for now - could use crypto.subtle.digest for better security
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

// Format session duration in human-readable format
export function formatSessionDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''}`
  } else {
    const days = Math.floor(seconds / 86400)
    return `${days} day${days > 1 ? 's' : ''}`
  }
}

// Format last activity time
export function formatLastActivity(lastActivityAt: Date | string): string {
  const lastActivity = typeof lastActivityAt === 'string' 
    ? new Date(lastActivityAt) 
    : lastActivityAt
  
  const now = Date.now()
  const diff = now - lastActivity.getTime()
  const seconds = Math.floor(diff / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

// Validate session token format
export function isValidSessionToken(token: string): boolean {
  return /^sso_[A-Za-z0-9_-]{48}$/.test(token)
}

// Get session cookie name
export function getSessionCookieName(): string {
  return 'sso_session_token'
}

// Get session cookie options
export function getSessionCookieOptions(rememberMe: boolean) {
  const maxAge = rememberMe 
    ? 30 * 24 * 60 * 60 // 30 days
    : 24 * 60 * 60 // 24 hours

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

// Sanitize device name for storage
export function sanitizeDeviceName(name: string): string {
  // Remove special characters, limit length
  return name
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
    .substring(0, 100)
    .trim()
}

// Detect suspicious activity patterns
export function detectSuspiciousActivity(
  currentIP: string | null,
  previousIP: string | null,
  currentUserAgent: string | null,
  previousUserAgent: string | null
): boolean {
  // If both IPs and user agents are completely different, it might be suspicious
  // This is a simple check - in production, you'd want more sophisticated detection
  
  if (!currentIP || !previousIP) return false
  
  // Different IP is not necessarily suspicious (mobile networks, VPN, etc.)
  // But combined with different user agent might be
  const ipChanged = currentIP !== previousIP
  const userAgentChanged = currentUserAgent !== previousUserAgent
  
  // Simple heuristic: both changed is potentially suspicious
  return ipChanged && userAgentChanged
}

// Generate logout notification payload for connected apps
export function generateLogoutNotification(sessionToken: string) {
  return {
    event: 'sso.logout',
    session_token: sessionToken,
    timestamp: new Date().toISOString(),
  }
}

// Batch revoke tokens for single logout
export async function notifyAppsOfLogout(
  connectedApps: Array<{ client_id: string; logout_url: string | null }>,
  sessionToken: string
): Promise<{ success: string[]; failed: Array<{ client_id: string; error: string }> }> {
  const notification = generateLogoutNotification(sessionToken)
  const results = {
    success: [] as string[],
    failed: [] as Array<{ client_id: string; error: string }>,
  }

  // Notify all apps in parallel
  await Promise.allSettled(
    connectedApps
      .filter(app => app.logout_url) // Only notify apps with logout URL
      .map(async (app) => {
        try {
          const response = await fetch(app.logout_url!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(notification),
            signal: AbortSignal.timeout(5000), // 5 second timeout
          })

          if (response.ok) {
            results.success.push(app.client_id)
          } else {
            results.failed.push({
              client_id: app.client_id,
              error: `HTTP ${response.status}`,
            })
          }
        } catch (error) {
          results.failed.push({
            client_id: app.client_id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      })
  )

  return results
}
