import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  validateAuthorizationRequest,
  validateRedirectUri,
  validateScopes,
  parseScopes,
  createOAuthError,
  formatErrorRedirect,
  generateAuthorizationCode,
  getExpirationDate,
} from '@/lib/oauth/utils'
import {
  getOAuthClient,
  getUserConsent,
  createAuthorizationCode as saveAuthorizationCode,
} from '@/lib/oauth/adapter'

// GET /api/oauth/authorize - Initial authorization request
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Validate request
    const validation = validateAuthorizationRequest(searchParams)
    if (!validation.valid && validation.error) {
      const redirectUri = searchParams.get('redirect_uri')
      if (redirectUri) {
        return NextResponse.redirect(formatErrorRedirect(redirectUri, validation.error))
      }
      return NextResponse.json(validation.error, { status: 400 })
    }

    const clientId = searchParams.get('client_id')!
    const redirectUri = searchParams.get('redirect_uri')!
    const scope = searchParams.get('scope')!
    const state = searchParams.get('state')
    const codeChallenge = searchParams.get('code_challenge')
    const codeChallengeMethod = searchParams.get('code_challenge_method')
    const tenantId = searchParams.get('tenant_id')

    // Verify client exists and is active
    const client = await getOAuthClient(clientId)
    if (!client) {
      const error = createOAuthError('invalid_client', 'Client not found or inactive', state || undefined)
      return NextResponse.redirect(formatErrorRedirect(redirectUri, error))
    }

    // Validate redirect URI
    if (!validateRedirectUri(redirectUri, client.redirect_uris)) {
      const error = createOAuthError('invalid_request', 'Invalid redirect_uri', state || undefined)
      return NextResponse.json(error, { status: 400 })
    }

    // Validate scopes
    const requestedScopes = parseScopes(scope)
    if (!validateScopes(requestedScopes, client.allowed_scopes)) {
      const error = createOAuthError('invalid_scope', 'One or more requested scopes are not allowed', state || undefined)
      return NextResponse.redirect(formatErrorRedirect(redirectUri, error))
    }

    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Determine tenant
    let effectiveTenantId = tenantId
    if (!effectiveTenantId) {
      // Get user's default tenant
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single()
      
      if (userTenants) {
        effectiveTenantId = userTenants.tenant_id
      }
    }

    if (!effectiveTenantId) {
      const error = createOAuthError('invalid_request', 'No tenant associated with user', state || undefined)
      return NextResponse.redirect(formatErrorRedirect(redirectUri, error))
    }

    // Check for existing consent
    const existingConsent = await getUserConsent(user.id, clientId, effectiveTenantId)
    
    // If consent exists and covers all requested scopes, auto-approve
    if (existingConsent && requestedScopes.every(s => existingConsent.scopes.includes(s))) {
      // Generate authorization code
      const code = generateAuthorizationCode()
      
      await saveAuthorizationCode({
        code,
        user_id: user.id,
        client_id: clientId,
        tenant_id: effectiveTenantId,
        redirect_uri: redirectUri,
        scope,
        code_challenge: codeChallenge || undefined,
        code_challenge_method: (codeChallengeMethod as 'S256' | 'plain') || undefined,
        expires_at: getExpirationDate(600).toISOString(), // 10 minutes
      })

      // Redirect with code
      const callbackUrl = new URL(redirectUri)
      callbackUrl.searchParams.set('code', code)
      if (state) {
        callbackUrl.searchParams.set('state', state)
      }
      
      return NextResponse.redirect(callbackUrl.toString())
    }

    // Show consent screen
    const consentUrl = new URL('/oauth/consent', request.url)
    consentUrl.searchParams.set('client_id', clientId)
    consentUrl.searchParams.set('redirect_uri', redirectUri)
    consentUrl.searchParams.set('scope', scope)
    if (state) consentUrl.searchParams.set('state', state)
    if (codeChallenge) consentUrl.searchParams.set('code_challenge', codeChallenge)
    if (codeChallengeMethod) consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod)
    consentUrl.searchParams.set('tenant_id', effectiveTenantId)
    
    return NextResponse.redirect(consentUrl.toString())
    
  } catch (error) {
    console.error('Authorization error:', error)
    return NextResponse.json(
      createOAuthError('server_error', 'Internal server error'),
      { status: 500 }
    )
  }
}

// POST /api/oauth/authorize - Handle consent submission
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const action = formData.get('action')
    const clientId = formData.get('client_id') as string
    const redirectUri = formData.get('redirect_uri') as string
    const scope = formData.get('scope') as string
    const state = formData.get('state') as string | null
    const codeChallenge = formData.get('code_challenge') as string | null
    const codeChallengeMethod = formData.get('code_challenge_method') as string | null
    const tenantId = formData.get('tenant_id') as string

    // User denied consent
    if (action === 'deny') {
      const error = createOAuthError('access_denied', 'User denied consent', state || undefined)
      return NextResponse.redirect(formatErrorRedirect(redirectUri, error))
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      const error = createOAuthError('invalid_request', 'User not authenticated', state || undefined)
      return NextResponse.redirect(formatErrorRedirect(redirectUri, error))
    }

    // Generate authorization code
    const code = generateAuthorizationCode()
    
    await saveAuthorizationCode({
      code,
      user_id: user.id,
      client_id: clientId,
      tenant_id: tenantId,
      redirect_uri: redirectUri,
      scope,
      code_challenge: codeChallenge || undefined,
      code_challenge_method: (codeChallengeMethod as 'S256' | 'plain') || undefined,
      expires_at: getExpirationDate(600).toISOString(), // 10 minutes
    })

    // Save consent
    const { createUserConsent } = await import('@/lib/oauth/adapter')
    await createUserConsent({
      user_id: user.id,
      client_id: clientId,
      tenant_id: tenantId,
      scopes: parseScopes(scope),
      expires_at: undefined, // Never expires unless revoked
    })

    // Redirect with code
    const callbackUrl = new URL(redirectUri)
    callbackUrl.searchParams.set('code', code)
    if (state) {
      callbackUrl.searchParams.set('state', state)
    }
    
    return NextResponse.redirect(callbackUrl.toString())
    
  } catch (error) {
    console.error('Authorization POST error:', error)
    return NextResponse.json(
      createOAuthError('server_error', 'Internal server error'),
      { status: 500 }
    )
  }
}
