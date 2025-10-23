import { createClient } from '@/lib/supabase/server'
import type {
  OAuthClient,
  OAuthAuthorizationCode,
  OAuthAccessToken,
  OAuthRefreshToken,
  OAuthUserConsent,
} from '@/types/oauth.types'
import { getExpirationDate } from './utils'

// OAuth Clients
export async function getOAuthClient(clientId: string): Promise<OAuthClient | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as OAuthClient
}

export async function createOAuthClient(
  client: Omit<OAuthClient, 'id' | 'created_at' | 'updated_at'>
): Promise<OAuthClient> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_clients')
    .insert(client)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create OAuth client: ${error.message}`)
  }

  return data as OAuthClient
}

export async function listOAuthClients(
  filters?: { is_active?: boolean; is_first_party?: boolean }
): Promise<OAuthClient[]> {
  const supabase = await createClient()
  
  let query = supabase.from('oauth_clients').select('*').order('created_at', { ascending: false })

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters?.is_first_party !== undefined) {
    query = query.eq('is_first_party', filters.is_first_party)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list OAuth clients: ${error.message}`)
  }

  return data as OAuthClient[]
}

export async function updateOAuthClient(
  clientId: string,
  updates: Partial<OAuthClient>
): Promise<OAuthClient> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update OAuth client: ${error.message}`)
  }

  return data as OAuthClient
}

export async function deleteOAuthClient(clientId: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('oauth_clients')
    .delete()
    .eq('client_id', clientId)

  if (error) {
    throw new Error(`Failed to delete OAuth client: ${error.message}`)
  }
}

// Authorization Codes
export async function createAuthorizationCode(
  code: Omit<OAuthAuthorizationCode, 'id' | 'created_at'>
): Promise<OAuthAuthorizationCode> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_authorization_codes')
    .insert(code)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create authorization code: ${error.message}`)
  }

  return data as OAuthAuthorizationCode
}

export async function getAuthorizationCode(code: string): Promise<OAuthAuthorizationCode | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_authorization_codes')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !data) {
    return null
  }

  return data as OAuthAuthorizationCode
}

export async function deleteAuthorizationCode(code: string): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('oauth_authorization_codes')
    .delete()
    .eq('code', code)
}

export async function cleanupExpiredAuthorizationCodes(): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('oauth_authorization_codes')
    .delete()
    .lt('expires_at', new Date().toISOString())
}

// Access Tokens
export async function createAccessToken(
  token: Omit<OAuthAccessToken, 'id' | 'created_at'>
): Promise<OAuthAccessToken> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_access_tokens')
    .insert(token)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create access token: ${error.message}`)
  }

  return data as OAuthAccessToken
}

export async function getAccessToken(token: string): Promise<OAuthAccessToken | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_access_tokens')
    .select('*')
    .eq('token', token)
    .is('revoked_at', null)
    .single()

  if (error || !data) {
    return null
  }

  return data as OAuthAccessToken
}

export async function revokeAccessToken(token: string): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('oauth_access_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token)
}

export async function cleanupExpiredAccessTokens(): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('oauth_access_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
}

export async function listAccessTokensByUser(userId: string): Promise<OAuthAccessToken[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_access_tokens')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list access tokens: ${error.message}`)
  }

  return data as OAuthAccessToken[]
}

// Refresh Tokens
export async function createRefreshToken(
  token: Omit<OAuthRefreshToken, 'id' | 'created_at'>
): Promise<OAuthRefreshToken> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_refresh_tokens')
    .insert(token)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create refresh token: ${error.message}`)
  }

  return data as OAuthRefreshToken
}

export async function getRefreshToken(token: string): Promise<OAuthRefreshToken | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_refresh_tokens')
    .select('*')
    .eq('token', token)
    .is('revoked_at', null)
    .single()

  if (error || !data) {
    return null
  }

  return data as OAuthRefreshToken
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('oauth_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token)
}

export async function revokeRefreshTokensByAccessToken(accessTokenId: string): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('oauth_refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('access_token_id', accessTokenId)
}

// User Consents
export async function getUserConsent(
  userId: string,
  clientId: string,
  tenantId: string
): Promise<OAuthUserConsent | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_user_consents')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    return null
  }

  // Check if consent is expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null
  }

  return data as OAuthUserConsent
}

export async function createUserConsent(
  consent: Omit<OAuthUserConsent, 'id' | 'granted_at'>
): Promise<OAuthUserConsent> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_user_consents')
    .upsert(consent, {
      onConflict: 'user_id,client_id,tenant_id',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create user consent: ${error.message}`)
  }

  return data as OAuthUserConsent
}

export async function revokeUserConsent(
  userId: string,
  clientId: string,
  tenantId: string
): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('oauth_user_consents')
    .delete()
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
}

export async function listUserConsents(userId: string): Promise<OAuthUserConsent[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('oauth_user_consents')
    .select('*')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list user consents: ${error.message}`)
  }

  return data as OAuthUserConsent[]
}

// Helper: Get user info with tenant and role
export async function getUserInfoWithTenant(userId: string, tenantId: string) {
  const supabase = await createClient()
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error(`Failed to get user profile: ${profileError.message}`)
  }

  // Get user's auth data
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    throw new Error(`Failed to get auth user: ${authError.message}`)
  }

  // Get user tenant association with role
  const { data: userTenant, error: tenantError } = await supabase
    .from('user_tenants')
    .select(`
      *,
      tenant:tenants(*),
      role:roles(*)
    `)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single()

  if (tenantError) {
    throw new Error(`Failed to get user tenant: ${tenantError.message}`)
  }

  return {
    user,
    profile,
    tenant: userTenant.tenant,
    role: userTenant.role,
  }
}
