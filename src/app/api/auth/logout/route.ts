import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  getSSOSession,
  revokeSSOSession,
  getConnectedAppsWithDetails,
  logSessionActivity,
} from '@/lib/sso/adapter'
import { notifyAppsOfLogout } from '@/lib/sso/utils'

// POST /api/auth/logout - Single Logout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { notify_apps = true } = body

    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('sso_session_token')?.value

    // Get current session before revoking
    let connectedApps: any[] = []
    if (sessionToken) {
      const session = await getSSOSession(sessionToken)
      
      if (session) {
        // Get connected apps for Single Logout notifications
        if (notify_apps) {
          connectedApps = await getConnectedAppsWithDetails(sessionToken)
        }

        // Revoke SSO session
        await revokeSSOSession(sessionToken)

        // Log logout activity
        await logSessionActivity({
          sso_session_id: session.id,
          activity_type: 'logout',
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
          user_agent: request.headers.get('user-agent') || undefined,
        })
      }
    }

    // Logout from Supabase Auth
    const supabase = await createClient()
    await supabase.auth.signOut()

    // Clear SSO session cookie
    cookieStore.delete('sso_session_token')

    // Notify connected apps (Single Logout)
    let notificationResults
    if (notify_apps && sessionToken && connectedApps.length > 0) {
      notificationResults = await notifyAppsOfLogout(
        connectedApps.map(app => ({
          client_id: app.client_id,
          logout_url: app.logout_url,
        })),
        sessionToken
      )
    }

    return NextResponse.json({
      success: true,
      apps_notified: notificationResults?.success || [],
      notification_errors: notificationResults?.failed || [],
    })
    
  } catch (error) {
    console.error('Logout error:', error)
    
    // Even if there's an error, try to clear auth
    try {
      const supabase = await createClient()
      await supabase.auth.signOut()
      
      const cookieStore = await cookies()
      cookieStore.delete('sso_session_token')
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    }

    return NextResponse.json(
      { error: 'Logout completed with errors' },
      { status: 500 }
    )
  }
}

// GET /api/auth/logout - For browser redirects (logout and redirect)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('sso_session_token')?.value

    if (sessionToken) {
      const session = await getSSOSession(sessionToken)
      
      if (session) {
        // Get connected apps
        const connectedApps = await getConnectedAppsWithDetails(sessionToken)

        // Revoke session
        await revokeSSOSession(sessionToken)

        // Log activity
        await logSessionActivity({
          sso_session_id: session.id,
          activity_type: 'logout',
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
          user_agent: request.headers.get('user-agent') || undefined,
        })

        // Notify apps
        if (connectedApps.length > 0) {
          await notifyAppsOfLogout(
            connectedApps.map(app => ({
              client_id: app.client_id,
              logout_url: app.logout_url,
            })),
            sessionToken
          )
        }
      }
    }

    // Logout from Supabase
    const supabase = await createClient()
    await supabase.auth.signOut()

    // Clear cookie
    cookieStore.delete('sso_session_token')

    // Redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('logged_out', 'true')
    
    return NextResponse.redirect(loginUrl)
    
  } catch (error) {
    console.error('Logout (GET) error:', error)
    
    // Cleanup and redirect anyway
    try {
      const supabase = await createClient()
      await supabase.auth.signOut()
      
      const cookieStore = await cookies()
      cookieStore.delete('sso_session_token')
    } catch {}

    return NextResponse.redirect(new URL('/login', request.url))
  }
}
