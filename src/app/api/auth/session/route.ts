import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createSSOSession } from '@/lib/sso/adapter'
import { getClientIP, getSessionCookieOptions } from '@/lib/sso/utils'

// POST /api/auth/session - Create SSO session after login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { remember_me } = body

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user's tenant (first active tenant)
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!userTenant) {
      return NextResponse.json(
        { error: 'No tenant associated with user' },
        { status: 400 }
      )
    }

    // Create SSO session
    const { session, session_token } = await createSSOSession({
      user_id: user.id,
      tenant_id: userTenant.tenant_id,
      ip_address: getClientIP(request.headers),
      user_agent: request.headers.get('user-agent') || undefined,
      remember_me: remember_me || false,
    })

    // Set SSO session cookie
    const cookieStore = await cookies()
    cookieStore.set(
      'sso_session_token',
      session_token,
      getSessionCookieOptions(remember_me || false)
    )

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        expires_at: session.expires_at,
        device_type: session.device_type,
        device_name: session.device_name,
      },
    })
    
  } catch (error) {
    console.error('Create SSO session error:', error)
    return NextResponse.json(
      { error: 'Failed to create SSO session' },
      { status: 500 }
    )
  }
}

// GET /api/auth/session - Get current SSO session
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('sso_session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No active SSO session' },
        { status: 404 }
      )
    }

    const { getSessionWithDetails } = await import('@/lib/sso/adapter')
    const session = await getSessionWithDetails(sessionToken)

    if (!session) {
      return NextResponse.json(
        { error: 'SSO session not found or expired' },
        { status: 404 }
      )
    }

    return NextResponse.json({ session })
    
  } catch (error) {
    console.error('Get SSO session error:', error)
    return NextResponse.json(
      { error: 'Failed to get SSO session' },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/session - Revoke SSO session (logout)
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('sso_session_token')?.value

    if (sessionToken) {
      const { revokeSSOSession } = await import('@/lib/sso/adapter')
      await revokeSSOSession(sessionToken)
    }

    // Clear SSO session cookie
    cookieStore.delete('sso_session_token')

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Revoke SSO session error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke SSO session' },
      { status: 500 }
    )
  }
}
