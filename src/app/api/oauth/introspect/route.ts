import { NextRequest, NextResponse } from 'next/server'
import {
  verifyClientSecret,
  verifyToken,
  createOAuthError,
} from '@/lib/oauth/utils'
import {
  getOAuthClient,
  getAccessToken,
} from '@/lib/oauth/adapter'
import type { IntrospectionResponse } from '@/types/oauth.types'

// POST /api/oauth/introspect - Token introspection endpoint (RFC 7662)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, token_type_hint, client_id, client_secret } = body

    // Validate required parameters
    if (!token) {
      return NextResponse.json(
        createOAuthError('invalid_request', 'Token is required'),
        { status: 400 }
      )
    }

    if (!client_id || !client_secret) {
      return NextResponse.json(
        createOAuthError('invalid_client', 'Client credentials are required'),
        { status: 401 }
      )
    }

    // Verify client credentials
    const client = await getOAuthClient(client_id)
    if (!client) {
      return NextResponse.json(
        createOAuthError('invalid_client', 'Client not found or inactive'),
        { status: 401 }
      )
    }

    const validSecret = await verifyClientSecret(client_secret, client.client_secret_hash)
    if (!validSecret) {
      return NextResponse.json(
        createOAuthError('invalid_client', 'Invalid client credentials'),
        { status: 401 }
      )
    }

    // Try to verify and introspect the token
    try {
      // First verify as JWT
      const payload = await verifyToken(token)
      
      // Check if token exists in database and is not revoked
      const tokenData = await getAccessToken(token)
      
      if (!tokenData || tokenData.revoked_at) {
        // Token is revoked or doesn't exist
        const response: IntrospectionResponse = {
          active: false,
        }
        return NextResponse.json(response)
      }

      // Token is valid and active
      const response: IntrospectionResponse = {
        active: true,
        scope: payload.scope,
        client_id: payload.client_id,
        token_type: 'Bearer',
        exp: payload.exp,
        iat: payload.iat,
        sub: payload.sub,
        tenant_id: payload.tenant_id,
      }

      return NextResponse.json(response)
      
    } catch (error) {
      // Token is invalid or expired
      const response: IntrospectionResponse = {
        active: false,
      }
      return NextResponse.json(response)
    }
    
  } catch (error) {
    console.error('Introspection endpoint error:', error)
    return NextResponse.json(
      createOAuthError('server_error', 'Internal server error'),
      { status: 500 }
    )
  }
}
