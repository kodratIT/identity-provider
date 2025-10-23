import { NextRequest, NextResponse } from 'next/server'
import {
  verifyClientSecret,
  createOAuthError,
} from '@/lib/oauth/utils'
import {
  getOAuthClient,
  revokeAccessToken,
  revokeRefreshToken,
} from '@/lib/oauth/adapter'

// POST /api/oauth/revoke - Token revocation endpoint
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

    // Attempt to revoke based on token_type_hint or try both
    if (token_type_hint === 'access_token') {
      await revokeAccessToken(token)
    } else if (token_type_hint === 'refresh_token') {
      await revokeRefreshToken(token)
    } else {
      // Try both if hint not provided (per RFC 7009)
      try {
        await revokeAccessToken(token)
      } catch {
        // If not an access token, try refresh token
        await revokeRefreshToken(token)
      }
    }

    // Per RFC 7009, always return 200 OK even if token doesn't exist
    // This prevents token scanning attacks
    return new NextResponse(null, { status: 200 })
    
  } catch (error) {
    console.error('Revoke endpoint error:', error)
    // Still return 200 per spec
    return new NextResponse(null, { status: 200 })
  }
}
