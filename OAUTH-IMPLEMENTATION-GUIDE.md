# OAuth 2.0 / OpenID Connect Implementation Guide

## Overview

This Identity Provider now supports **OAuth 2.0** and **OpenID Connect** protocols, allowing external applications (Service Providers) to integrate with single sign-on (SSO) capabilities.

**Key Features:**
- ✅ Authorization Code Flow with PKCE
- ✅ Refresh Token Support
- ✅ OpenID Connect (OIDC) for user identity
- ✅ Multi-tenant support
- ✅ Fine-grained scopes and permissions
- ✅ Consent management
- ✅ Token introspection and revocation

---

## Quick Start for Developers

### 1. Register Your Application

First, you need to register your application as an OAuth client. This can be done via:
- Admin Dashboard: `/dashboard/applications` (coming soon)
- Direct database insert (for now)

**Example SQL to register a client:**

```sql
INSERT INTO oauth_clients (
  client_id,
  client_secret_hash,
  name,
  description,
  logo_url,
  homepage_url,
  redirect_uris,
  allowed_scopes,
  allowed_grant_types,
  token_expiration,
  refresh_token_expiration,
  is_active,
  is_first_party
) VALUES (
  'client_lms_12345',
  -- Hash your client_secret using: await hashClientSecret('your-secret')
  'hashed_secret_here',
  'Learning Management System',
  'School LMS for courses and assignments',
  'https://lms.example.com/logo.png',
  'https://lms.example.com',
  ARRAY['https://lms.example.com/callback', 'https://lms.example.com/auth/callback'],
  ARRAY['openid', 'profile', 'email', 'grades:read'],
  ARRAY['authorization_code', 'refresh_token'],
  3600,  -- 1 hour
  2592000,  -- 30 days
  true,
  false
);
```

**Generate client_secret hash in Node.js:**
```javascript
import { hashClientSecret } from '@/lib/oauth/utils'

const secret = 'your-random-secret-min-48-chars'
const hash = await hashClientSecret(secret)
console.log(hash)
```

### 2. OAuth 2.0 Authorization Code Flow (with PKCE)

#### Step 1: Generate Code Verifier and Challenge (Client-side)

```javascript
// Generate code verifier (random string)
function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

// Generate code challenge (SHA-256 hash of verifier)
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(hash))
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Usage
const codeVerifier = generateCodeVerifier()
const codeChallenge = await generateCodeChallenge(codeVerifier)

// Store codeVerifier in sessionStorage for later use
sessionStorage.setItem('code_verifier', codeVerifier)
```

#### Step 2: Redirect User to Authorization Endpoint

```javascript
const authUrl = new URL('https://identity-provider.school.com/api/oauth/authorize')
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('client_id', 'client_lms_12345')
authUrl.searchParams.set('redirect_uri', 'https://lms.example.com/callback')
authUrl.searchParams.set('scope', 'openid profile email grades:read')
authUrl.searchParams.set('state', generateRandomState()) // CSRF protection
authUrl.searchParams.set('code_challenge', codeChallenge)
authUrl.searchParams.set('code_challenge_method', 'S256')

// Redirect user
window.location.href = authUrl.toString()
```

#### Step 3: Handle Callback and Exchange Code for Tokens

```javascript
// In your /callback route
const urlParams = new URLSearchParams(window.location.search)
const code = urlParams.get('code')
const state = urlParams.get('state')

// Verify state (CSRF protection)
if (state !== sessionStorage.getItem('oauth_state')) {
  throw new Error('Invalid state parameter')
}

// Retrieve code_verifier
const codeVerifier = sessionStorage.getItem('code_verifier')

// Exchange code for tokens (backend request)
const response = await fetch('https://identity-provider.school.com/api/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'https://lms.example.com/callback',
    client_id: 'client_lms_12345',
    client_secret: 'your-client-secret',
    code_verifier: codeVerifier,
  }),
})

const tokens = await response.json()
// {
//   access_token: "eyJhbGci...",
//   token_type: "Bearer",
//   expires_in: 3600,
//   refresh_token: "refresh_token_here",
//   scope: "openid profile email grades:read",
//   id_token: "eyJhbGci..." // OpenID Connect ID Token
// }

// Store tokens securely (backend session recommended)
```

#### Step 4: Use Access Token to Call APIs

```javascript
// Get user info
const userInfoResponse = await fetch('https://identity-provider.school.com/api/oauth/userinfo', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})

const userInfo = await userInfoResponse.json()
// {
//   sub: "user-id",
//   email: "student@school.com",
//   email_verified: true,
//   name: "John Doe",
//   picture: "https://...",
//   tenant_id: "tenant-id",
//   tenant_name: "Springfield High School",
//   role: "student",
//   permissions: ["grades:read", "attendance:read"]
// }
```

#### Step 5: Refresh Access Token

```javascript
const refreshResponse = await fetch('https://identity-provider.school.com/api/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: 'client_lms_12345',
    client_secret: 'your-client-secret',
  }),
})

const newTokens = await refreshResponse.json()
```

---

## OpenID Connect Discovery

The Identity Provider supports OpenID Connect Discovery:

```bash
curl https://identity-provider.school.com/.well-known/openid-configuration
```

**Response:**
```json
{
  "issuer": "https://identity-provider.school.com",
  "authorization_endpoint": "https://identity-provider.school.com/api/oauth/authorize",
  "token_endpoint": "https://identity-provider.school.com/api/oauth/token",
  "userinfo_endpoint": "https://identity-provider.school.com/api/oauth/userinfo",
  "jwks_uri": "https://identity-provider.school.com/.well-known/jwks.json",
  "revocation_endpoint": "https://identity-provider.school.com/api/oauth/revoke",
  "introspection_endpoint": "https://identity-provider.school.com/api/oauth/introspect",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["HS256", "RS256"],
  "scopes_supported": ["openid", "profile", "email", "phone", ...],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
  "claims_supported": ["sub", "email", "name", "picture", "tenant_id", "role", ...],
  "code_challenge_methods_supported": ["S256", "plain"],
  "grant_types_supported": ["authorization_code", "refresh_token"]
}
```

---

## Available Scopes

### Standard OpenID Connect Scopes
- **openid**: Required for OpenID Connect authentication
- **profile**: Access to user's profile (name, picture)
- **email**: Access to user's email address
- **phone**: Access to user's phone number

### Custom School Ecosystem Scopes
- **school:read**: Read school information
- **school:write**: Update school information
- **grades:read**: Read student grades
- **grades:write**: Update student grades
- **attendance:read**: Read attendance records
- **attendance:write**: Mark attendance
- **library:read**: Read library records
- **library:write**: Borrow/return books
- **finance:read**: Read payment records
- **finance:write**: Process payments

---

## Token Revocation

Revoke an access or refresh token:

```javascript
await fetch('https://identity-provider.school.com/api/oauth/revoke', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: tokenToRevoke,
    token_type_hint: 'access_token', // or 'refresh_token'
    client_id: 'client_lms_12345',
    client_secret: 'your-client-secret',
  }),
})
```

---

## Token Introspection

Check if a token is valid and get its metadata:

```javascript
const introspectResponse = await fetch('https://identity-provider.school.com/api/oauth/introspect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: accessToken,
    token_type_hint: 'access_token',
    client_id: 'client_lms_12345',
    client_secret: 'your-client-secret',
  }),
})

const result = await introspectResponse.json()
// {
//   active: true,
//   scope: "openid profile email grades:read",
//   client_id: "client_lms_12345",
//   token_type: "Bearer",
//   exp: 1698765432,
//   iat: 1698761832,
//   sub: "user-id",
//   tenant_id: "tenant-id"
// }
```

---

## Security Best Practices

### For Client Applications

1. **Always use PKCE** (Proof Key for Code Exchange) for authorization code flow
2. **Store tokens securely** - Use HTTP-only cookies or secure backend sessions
3. **Validate state parameter** - Prevent CSRF attacks
4. **Use HTTPS** - All OAuth communications must use HTTPS in production
5. **Rotate refresh tokens** - Request new tokens regularly
6. **Validate ID tokens** - Verify signature and claims
7. **Handle token expiration** - Implement automatic token refresh
8. **Revoke tokens on logout** - Clean up tokens when user logs out

### For Identity Provider

1. **Secure JWT_SECRET** - Use a strong random secret (min 32 chars)
2. **Enable HTTPS** - Always use HTTPS in production
3. **Rate limiting** - Implement rate limiting on OAuth endpoints
4. **Audit logging** - Log all OAuth operations
5. **Token cleanup** - Run periodic cleanup of expired tokens
6. **Review client applications** - Regularly audit registered clients

---

## Setup Instructions

### 1. Apply OAuth Database Migration

```bash
# Run the OAuth schema migration
psql $DATABASE_URL -f database-oauth.sql

# Apply RLS policies
psql $DATABASE_URL -f oauth-rls-policies.sql
```

### 2. Configure Environment Variables

Add to your `.env.local`:

```env
# OAuth 2.0 Configuration
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters-for-production-security

# App URL (for OAuth callbacks)
NEXT_PUBLIC_APP_URL=https://your-identity-provider.com
```

**Generate a secure JWT_SECRET:**

```bash
# Using OpenSSL
openssl rand -base64 48

# Using Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### 3. Test OAuth Flow

Use the provided test client in `/tests/oauth-test-client.html` (coming soon) or integrate with your application.

---

## Troubleshooting

### Common Issues

**1. "Invalid redirect_uri"**
- Ensure the redirect_uri in your request exactly matches one registered in oauth_clients table

**2. "Invalid code_verifier"**
- Make sure you're using the same code_verifier that generated the code_challenge
- Verify base64url encoding is correct

**3. "Authorization code has expired"**
- Authorization codes expire in 10 minutes - complete the token exchange quickly

**4. "Invalid client credentials"**
- Double-check your client_id and client_secret
- Ensure client is active in the database

**5. "Token has expired"**
- Use the refresh_token to get a new access_token

---

## Next Steps

1. **Create Application Management UI** - Admin dashboard to register/manage OAuth clients
2. **Implement Webhooks** - Notify applications of user events
3. **Add OAuth Analytics** - Track token usage, popular scopes, etc.
4. **Create SDK Libraries** - JavaScript, Python, PHP SDKs for easier integration
5. **Enhanced Consent UI** - More detailed permission descriptions

---

## Support

For questions or issues:
- Check logs: `/dashboard/audit-logs`
- Review consent: `/dashboard/applications/consents`
- Contact admin: support@school.com

---

**Last Updated:** October 23, 2025  
**Version:** 1.0.0 (Phase 7 Complete)
