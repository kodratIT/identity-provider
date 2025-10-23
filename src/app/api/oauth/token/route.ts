import { NextRequest, NextResponse } from 'next/server'
import {
  validateTokenRequest,
  verifyClientSecret,
  verifyCodeChallenge,
  createOAuthError,
  generateAccessToken,
  generateIDToken,
  generateToken,
  getExpirationDate,
  isExpired,
  parseScopes,
} from '@/lib/oauth/utils'
import {
  getOAuthClient,
  getAuthorizationCode,
  deleteAuthorizationCode,
  createAccessToken,
  createRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
  getUserInfoWithTenant,
} from '@/lib/oauth/adapter'
import { connectApp, getSSOSession, getClientIP } from '@/lib/sso/adapter'
import type { TokenResponse } from '@/types/oauth.types'

// POST /api/oauth/token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request
    const validation = validateTokenRequest(body)
    if (!validation.valid && validation.error) {
      return NextResponse.json(validation.error, { status: 400 })
    }

    const { grant_type, client_id, client_secret } = body

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

    // Check if grant type is allowed for this client
    if (!client.allowed_grant_types.includes(grant_type)) {
      return NextResponse.json(
        createOAuthError('unauthorized_client', `Grant type "${grant_type}" not allowed for this client`),
        { status: 400 }
      )
    }

    // Handle authorization code grant
    if (grant_type === 'authorization_code') {
      return handleAuthorizationCodeGrant(body, client)
    }

    // Handle refresh token grant
    if (grant_type === 'refresh_token') {
      return handleRefreshTokenGrant(body, client)
    }

    return NextResponse.json(
      createOAuthError('unsupported_grant_type', 'Grant type not supported'),
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Token endpoint error:', error)
    return NextResponse.json(
      createOAuthError('server_error', 'Internal server error'),
      { status: 500 }
    )
  }
}

// Handle authorization_code grant
async function handleAuthorizationCodeGrant(body: any, client: any) {
  const { code, redirect_uri, code_verifier } = body

  // Retrieve authorization code
  const authCode = await getAuthorizationCode(code)
  if (!authCode) {
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Authorization code not found or expired'),
      { status: 400 }
    )
  }

  // Verify client matches
  if (authCode.client_id !== client.client_id) {
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Authorization code was issued to another client'),
      { status: 400 }
    )
  }

  // Verify redirect URI matches
  if (authCode.redirect_uri !== redirect_uri) {
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Redirect URI does not match'),
      { status: 400 }
    )
  }

  // Check if expired
  if (isExpired(authCode.expires_at)) {
    await deleteAuthorizationCode(code)
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Authorization code has expired'),
      { status: 400 }
    )
  }

  // Verify PKCE if present
  if (authCode.code_challenge) {
    if (!code_verifier) {
      return NextResponse.json(
        createOAuthError('invalid_grant', 'Code verifier required for PKCE'),
        { status: 400 }
      )
    }

    const validChallenge = await verifyCodeChallenge(
      code_verifier,
      authCode.code_challenge,
      authCode.code_challenge_method as 'S256' | 'plain'
    )

    if (!validChallenge) {
      return NextResponse.json(
        createOAuthError('invalid_grant', 'Invalid code verifier'),
        { status: 400 }
      )
    }
  }

  // Get user info
  const userInfo = await getUserInfoWithTenant(authCode.user_id, authCode.tenant_id)

  // Generate tokens
  const accessTokenString = generateToken(48)
  const refreshTokenString = generateToken(48)
  
  const accessTokenExpiration = getExpirationDate(client.token_expiration)
  const refreshTokenExpiration = getExpirationDate(client.refresh_token_expiration)

  // Generate JWT access token
  const jwtAccessToken = await generateAccessToken({
    sub: authCode.user_id,
    client_id: client.client_id,
    tenant_id: authCode.tenant_id,
    scope: authCode.scope,
  }, client.token_expiration)

  // Save access token
  const savedAccessToken = await createAccessToken({
    token: accessTokenString,
    user_id: authCode.user_id,
    client_id: client.client_id,
    tenant_id: authCode.tenant_id,
    scope: authCode.scope,
    expires_at: accessTokenExpiration.toISOString(),
  })

  // Save refresh token
  await createRefreshToken({
    token: refreshTokenString,
    access_token_id: savedAccessToken.id,
    expires_at: refreshTokenExpiration.toISOString(),
  })

  // Delete authorization code (one-time use)
  await deleteAuthorizationCode(code)

  // Track connected app in SSO session (if session cookie exists)
  const sessionCookie = body.session_token || request.cookies.get('sso_session_token')?.value
  if (sessionCookie) {
    try {
      await connectApp(
        sessionCookie,
        client.client_id,
        undefined, // app session token (optional)
        client.redirect_uris[0] // Use first redirect URI as logout callback
      )
    } catch (error) {
      // Non-critical - log but don't fail the token issuance
      console.error('Failed to connect app to SSO session:', error)
    }
  }

  // Generate ID token if openid scope is requested
  let idToken: string | undefined
  const scopes = parseScopes(authCode.scope)
  if (scopes.includes('openid')) {
    idToken = await generateIDToken({
      sub: userInfo.user.id,
      aud: client.client_id,
      email: userInfo.user.email,
      email_verified: userInfo.user.email_confirmed_at ? true : false,
      name: userInfo.profile.full_name || undefined,
      picture: userInfo.profile.avatar_url || undefined,
      tenant_id: authCode.tenant_id,
      tenant_name: userInfo.tenant.name,
      role: userInfo.role?.name,
    }, client.token_expiration)
  }

  // Build token response
  const response: TokenResponse = {
    access_token: jwtAccessToken,
    token_type: 'Bearer',
    expires_in: client.token_expiration,
    refresh_token: refreshTokenString,
    scope: authCode.scope,
    id_token: idToken,
  }

  return NextResponse.json(response)
}

// Handle refresh_token grant
async function handleRefreshTokenGrant(body: any, client: any) {
  const { refresh_token } = body

  // Retrieve refresh token
  const refreshTokenData = await getRefreshToken(refresh_token)
  if (!refreshTokenData) {
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Refresh token not found or revoked'),
      { status: 400 }
    )
  }

  // Check if expired
  if (isExpired(refreshTokenData.expires_at)) {
    await revokeRefreshToken(refresh_token)
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Refresh token has expired'),
      { status: 400 }
    )
  }

  // Get original access token to retrieve user and tenant info
  const { getAccessToken } = await import('@/lib/oauth/adapter')
  const { data: originalToken } = await (await import('@/lib/supabase/server').then(m => m.createClient()))
    .from('oauth_access_tokens')
    .select('*')
    .eq('id', refreshTokenData.access_token_id)
    .single()

  if (!originalToken) {
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Original access token not found'),
      { status: 400 }
    )
  }

  // Get user info
  const userInfo = await getUserInfoWithTenant(originalToken.user_id, originalToken.tenant_id)

  // Generate new tokens
  const newAccessTokenString = generateToken(48)
  const newRefreshTokenString = generateToken(48)
  
  const accessTokenExpiration = getExpirationDate(client.token_expiration)
  const refreshTokenExpiration = getExpirationDate(client.refresh_token_expiration)

  // Generate new JWT access token
  const jwtAccessToken = await generateAccessToken({
    sub: originalToken.user_id,
    client_id: client.client_id,
    tenant_id: originalToken.tenant_id,
    scope: originalToken.scope,
  }, client.token_expiration)

  // Save new access token
  const savedAccessToken = await createAccessToken({
    token: newAccessTokenString,
    user_id: originalToken.user_id,
    client_id: client.client_id,
    tenant_id: originalToken.tenant_id,
    scope: originalToken.scope,
    expires_at: accessTokenExpiration.toISOString(),
  })

  // Save new refresh token
  await createRefreshToken({
    token: newRefreshTokenString,
    access_token_id: savedAccessToken.id,
    expires_at: refreshTokenExpiration.toISOString(),
  })

  // Revoke old refresh token
  await revokeRefreshToken(refresh_token)

  // Generate new ID token if openid scope was requested
  let idToken: string | undefined
  const scopes = parseScopes(originalToken.scope)
  if (scopes.includes('openid')) {
    idToken = await generateIDToken({
      sub: userInfo.user.id,
      aud: client.client_id,
      email: userInfo.user.email,
      email_verified: userInfo.user.email_confirmed_at ? true : false,
      name: userInfo.profile.full_name || undefined,
      picture: userInfo.profile.avatar_url || undefined,
      tenant_id: originalToken.tenant_id,
      tenant_name: userInfo.tenant.name,
      role: userInfo.role?.name,
    }, client.token_expiration)
  }

  // Build token response
  const response: TokenResponse = {
    access_token: jwtAccessToken,
    token_type: 'Bearer',
    expires_in: client.token_expiration,
    refresh_token: newRefreshTokenString,
    scope: originalToken.scope,
    id_token: idToken,
  }

  return NextResponse.json(response)
}
