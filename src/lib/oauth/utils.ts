import { nanoid } from 'nanoid'
import { SignJWT, jwtVerify, importJWK, exportJWK } from 'jose'
import type { AccessTokenPayload, IDTokenPayload, OAuthError } from '@/types/oauth.types'

// Environment configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const ISSUER = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Generate cryptographically secure random string
export function generateToken(length: number = 32): string {
  return nanoid(length)
}

// Generate authorization code (short-lived, one-time use)
export function generateAuthorizationCode(): string {
  return nanoid(32)
}

// Generate access token (JWT)
export async function generateAccessToken(
  payload: Omit<AccessTokenPayload, 'exp' | 'iat' | 'jti'>,
  expiresIn: number = 3600 // seconds
): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  
  const token = await new SignJWT({
    ...payload,
    jti: nanoid(16),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(`${expiresIn}s`)
    .sign(secret)

  return token
}

// Generate ID token (OpenID Connect)
export async function generateIDToken(
  payload: Omit<IDTokenPayload, 'exp' | 'iat' | 'iss'>,
  expiresIn: number = 3600
): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  
  const token = await new SignJWT({
    ...payload,
    iss: ISSUER,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secret)

  return token
}

// Verify JWT token
export async function verifyToken(token: string): Promise<AccessTokenPayload> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
    })
    
    return payload as unknown as AccessTokenPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

// Hash client secret using Web Crypto API
export async function hashClientSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(secret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// Verify client secret
export async function verifyClientSecret(
  plainSecret: string,
  hashedSecret: string
): Promise<boolean> {
  const hashedInput = await hashClientSecret(plainSecret)
  return hashedInput === hashedSecret
}

// PKCE: Verify code challenge
export async function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: 'S256' | 'plain' = 'S256'
): Promise<boolean> {
  if (method === 'plain') {
    return codeVerifier === codeChallenge
  }
  
  // S256: BASE64URL(SHA256(code_verifier))
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  
  // Base64URL encoding
  const base64 = btoa(String.fromCharCode(...hashArray))
  const base64url = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  return base64url === codeChallenge
}

// Validate redirect URI
export function validateRedirectUri(
  redirectUri: string,
  allowedUris: string[]
): boolean {
  return allowedUris.includes(redirectUri)
}

// Validate scopes
export function validateScopes(
  requestedScopes: string[],
  allowedScopes: string[]
): boolean {
  return requestedScopes.every(scope => allowedScopes.includes(scope))
}

// Parse scope string to array
export function parseScopes(scopeString: string): string[] {
  return scopeString.split(' ').filter(Boolean)
}

// Join scopes array to string
export function joinScopes(scopes: string[]): string {
  return scopes.join(' ')
}

// Create OAuth error response
export function createOAuthError(
  error: OAuthError['error'],
  description?: string,
  state?: string
): OAuthError {
  return {
    error,
    error_description: description,
    state,
  }
}

// Format error for redirect
export function formatErrorRedirect(
  redirectUri: string,
  error: OAuthError
): string {
  const url = new URL(redirectUri)
  url.searchParams.set('error', error.error)
  if (error.error_description) {
    url.searchParams.set('error_description', error.error_description)
  }
  if (error.state) {
    url.searchParams.set('state', error.state)
  }
  return url.toString()
}

// Calculate expiration date
export function getExpirationDate(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000)
}

// Check if token is expired
export function isExpired(expiresAt: Date | string): boolean {
  const expirationDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return expirationDate.getTime() < Date.now()
}

// Generate client credentials
export function generateClientCredentials(): {
  client_id: string
  client_secret: string
} {
  return {
    client_id: `client_${nanoid(24)}`,
    client_secret: nanoid(48),
  }
}

// Validate authorization request
export function validateAuthorizationRequest(params: URLSearchParams): {
  valid: boolean
  error?: OAuthError
} {
  const responseType = params.get('response_type')
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  const scope = params.get('scope')
  const state = params.get('state')

  if (!responseType || responseType !== 'code') {
    return {
      valid: false,
      error: createOAuthError(
        'invalid_request',
        'response_type must be "code"',
        state || undefined
      ),
    }
  }

  if (!clientId) {
    return {
      valid: false,
      error: createOAuthError('invalid_request', 'client_id is required', state || undefined),
    }
  }

  if (!redirectUri) {
    return {
      valid: false,
      error: createOAuthError('invalid_request', 'redirect_uri is required', state || undefined),
    }
  }

  if (!scope) {
    return {
      valid: false,
      error: createOAuthError('invalid_request', 'scope is required', state || undefined),
    }
  }

  return { valid: true }
}

// Validate token request
export function validateTokenRequest(body: any): {
  valid: boolean
  error?: OAuthError
} {
  const { grant_type, client_id, client_secret } = body

  if (!grant_type) {
    return {
      valid: false,
      error: createOAuthError('invalid_request', 'grant_type is required'),
    }
  }

  if (!['authorization_code', 'refresh_token'].includes(grant_type)) {
    return {
      valid: false,
      error: createOAuthError('unsupported_grant_type', `grant_type "${grant_type}" is not supported`),
    }
  }

  if (!client_id) {
    return {
      valid: false,
      error: createOAuthError('invalid_request', 'client_id is required'),
    }
  }

  if (!client_secret) {
    return {
      valid: false,
      error: createOAuthError('invalid_request', 'client_secret is required'),
    }
  }

  if (grant_type === 'authorization_code') {
    if (!body.code) {
      return {
        valid: false,
        error: createOAuthError('invalid_request', 'code is required for authorization_code grant'),
      }
    }
    if (!body.redirect_uri) {
      return {
        valid: false,
        error: createOAuthError('invalid_request', 'redirect_uri is required for authorization_code grant'),
      }
    }
  }

  if (grant_type === 'refresh_token') {
    if (!body.refresh_token) {
      return {
        valid: false,
        error: createOAuthError('invalid_request', 'refresh_token is required for refresh_token grant'),
      }
    }
  }

  return { valid: true }
}

// Extract Bearer token from Authorization header
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

// Generate JWKS (JSON Web Key Set) for public key discovery
export async function generateJWKS() {
  // For production, use asymmetric keys (RS256)
  // For now, we'll return an empty set since we're using HS256 (symmetric)
  return {
    keys: [],
  }
}
