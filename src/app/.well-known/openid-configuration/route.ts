import { NextResponse } from 'next/server'
import type { OpenIDConfiguration } from '@/types/oauth.types'
import { OAUTH_SCOPES } from '@/types/oauth.types'

// GET /.well-known/openid-configuration
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const configuration: OpenIDConfiguration = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    userinfo_endpoint: `${baseUrl}/api/oauth/userinfo`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    revocation_endpoint: `${baseUrl}/api/oauth/revoke`,
    introspection_endpoint: `${baseUrl}/api/oauth/introspect`,
    
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256', 'RS256'],
    
    scopes_supported: Object.keys(OAUTH_SCOPES),
    
    token_endpoint_auth_methods_supported: [
      'client_secret_post',
      'client_secret_basic',
    ],
    
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'email',
      'email_verified',
      'name',
      'picture',
      'phone_number',
      'tenant_id',
      'tenant_name',
      'role',
      'permissions',
    ],
    
    code_challenge_methods_supported: ['S256', 'plain'],
    
    grant_types_supported: [
      'authorization_code',
      'refresh_token',
    ],
  }

  return NextResponse.json(configuration, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Type': 'application/json',
    },
  })
}
