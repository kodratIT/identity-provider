// OAuth 2.0 and OpenID Connect Types

export interface OAuthClient {
  id: string
  client_id: string
  client_secret_hash: string
  name: string
  description?: string
  logo_url?: string
  homepage_url?: string
  redirect_uris: string[]
  allowed_scopes: string[]
  allowed_grant_types: string[]
  token_expiration: number // seconds
  refresh_token_expiration: number // seconds
  is_active: boolean
  is_first_party: boolean
  created_at: string
  updated_at: string
}

export interface OAuthAuthorizationCode {
  id: string
  code: string
  user_id: string
  client_id: string
  tenant_id: string
  redirect_uri: string
  scope: string
  code_challenge?: string
  code_challenge_method?: string
  expires_at: string
  created_at: string
}

export interface OAuthAccessToken {
  id: string
  token: string
  user_id: string
  client_id: string
  tenant_id: string
  scope: string
  expires_at: string
  revoked_at?: string
  created_at: string
}

export interface OAuthRefreshToken {
  id: string
  token: string
  access_token_id: string
  expires_at: string
  revoked_at?: string
  created_at: string
}

export interface OAuthUserConsent {
  id: string
  user_id: string
  client_id: string
  tenant_id: string
  scopes: string[]
  granted_at: string
  expires_at?: string
}

// Request/Response Types

export interface AuthorizeRequest {
  response_type: 'code'
  client_id: string
  redirect_uri: string
  scope: string
  state: string
  code_challenge?: string
  code_challenge_method?: 'S256' | 'plain'
  tenant_id?: string // Custom parameter for tenant context
}

export interface TokenRequest {
  grant_type: 'authorization_code' | 'refresh_token'
  code?: string
  refresh_token?: string
  redirect_uri?: string
  client_id: string
  client_secret: string
  code_verifier?: string // PKCE
}

export interface TokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token?: string
  scope: string
  id_token?: string // OpenID Connect
}

export interface UserInfoResponse {
  sub: string // user_id
  email: string
  email_verified: boolean
  name?: string
  picture?: string
  phone_number?: string
  updated_at?: string
  // Custom claims
  tenant_id?: string
  tenant_name?: string
  role?: string
  permissions?: string[]
}

export interface IntrospectionRequest {
  token: string
  token_type_hint?: 'access_token' | 'refresh_token'
  client_id: string
  client_secret: string
}

export interface IntrospectionResponse {
  active: boolean
  scope?: string
  client_id?: string
  username?: string
  token_type?: string
  exp?: number
  iat?: number
  sub?: string
  tenant_id?: string
}

export interface RevokeRequest {
  token: string
  token_type_hint?: 'access_token' | 'refresh_token'
  client_id: string
  client_secret: string
}

// OpenID Connect Discovery
export interface OpenIDConfiguration {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  revocation_endpoint: string
  introspection_endpoint: string
  response_types_supported: string[]
  subject_types_supported: string[]
  id_token_signing_alg_values_supported: string[]
  scopes_supported: string[]
  token_endpoint_auth_methods_supported: string[]
  claims_supported: string[]
  code_challenge_methods_supported: string[]
  grant_types_supported: string[]
}

// OAuth Scopes
export const OAUTH_SCOPES = {
  // OpenID Connect
  openid: 'OpenID Connect authentication',
  profile: 'Read user profile (name, avatar)',
  email: 'Read user email address',
  phone: 'Read user phone number',
  
  // Custom scopes for school ecosystem
  'school:read': 'Read school information',
  'school:write': 'Update school information',
  'grades:read': 'Read student grades',
  'grades:write': 'Update student grades',
  'attendance:read': 'Read attendance records',
  'attendance:write': 'Mark attendance',
  'library:read': 'Read library records',
  'library:write': 'Borrow/return books',
  'finance:read': 'Read payment records',
  'finance:write': 'Process payments',
} as const

export type OAuthScope = keyof typeof OAUTH_SCOPES

// JWT Payload Types
export interface AccessTokenPayload {
  sub: string // user_id
  client_id: string
  tenant_id: string
  scope: string
  exp: number
  iat: number
  jti: string // token id
}

export interface IDTokenPayload {
  sub: string // user_id
  aud: string // client_id
  exp: number
  iat: number
  iss: string // issuer
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  tenant_id?: string
  tenant_name?: string
  role?: string
}

// Error Types
export interface OAuthError {
  error: 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope' | 'access_denied' | 'server_error'
  error_description?: string
  error_uri?: string
  state?: string
}

export interface OAuthErrorResponse extends OAuthError {
  status: number
}
