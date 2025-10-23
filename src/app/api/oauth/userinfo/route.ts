import { NextRequest, NextResponse } from 'next/server'
import {
  extractBearerToken,
  verifyToken,
  createOAuthError,
} from '@/lib/oauth/utils'
import { getUserInfoWithTenant } from '@/lib/oauth/adapter'
import type { UserInfoResponse } from '@/types/oauth.types'

// GET /api/oauth/userinfo - OpenID Connect UserInfo endpoint
export async function GET(request: NextRequest) {
  try {
    // Extract access token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)
    
    if (!token) {
      return NextResponse.json(
        createOAuthError('invalid_request', 'Missing or invalid Authorization header'),
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="OAuth", error="invalid_request"'
          }
        }
      )
    }

    // Verify JWT token
    let payload
    try {
      payload = await verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        createOAuthError('invalid_token', 'Invalid or expired access token'),
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="OAuth", error="invalid_token"'
          }
        }
      )
    }

    // Get user info with tenant context
    const userInfo = await getUserInfoWithTenant(payload.sub, payload.tenant_id)

    // Build UserInfo response based on requested scopes
    const scopes = payload.scope.split(' ')
    const response: UserInfoResponse = {
      sub: userInfo.user.id,
      email: userInfo.user.email!,
      email_verified: userInfo.user.email_confirmed_at ? true : false,
    }

    // Add profile info if 'profile' scope is granted
    if (scopes.includes('profile')) {
      response.name = userInfo.profile.full_name || undefined
      response.picture = userInfo.profile.avatar_url || undefined
      response.updated_at = userInfo.profile.updated_at
    }

    // Add phone if 'phone' scope is granted
    if (scopes.includes('phone')) {
      response.phone_number = userInfo.profile.phone || undefined
    }

    // Add custom tenant and role information
    response.tenant_id = userInfo.tenant.id
    response.tenant_name = userInfo.tenant.name
    response.role = userInfo.role?.name

    // Add permissions if available
    if (userInfo.role) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select(`
          permission:permissions(name)
        `)
        .eq('role_id', userInfo.role.id)

      if (rolePermissions) {
        response.permissions = rolePermissions.map((rp: any) => rp.permission.name)
      }
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('UserInfo endpoint error:', error)
    return NextResponse.json(
      createOAuthError('server_error', 'Internal server error'),
      { status: 500 }
    )
  }
}

// POST method also supported (per OAuth 2.0 spec)
export async function POST(request: NextRequest) {
  return GET(request)
}
