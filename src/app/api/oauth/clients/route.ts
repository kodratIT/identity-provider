import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  listOAuthClients,
  createOAuthClient,
} from '@/lib/oauth/adapter'
import {
  generateClientCredentials,
  hashClientSecret,
} from '@/lib/oauth/utils'

// GET /api/oauth/clients - List all OAuth clients
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!userTenant || !['super_admin', 'admin'].includes(userTenant.role?.name)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get filters from query params
    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('is_active')
    const isFirstParty = searchParams.get('is_first_party')

    const filters: any = {}
    if (isActive !== null) filters.is_active = isActive === 'true'
    if (isFirstParty !== null) filters.is_first_party = isFirstParty === 'true'

    const clients = await listOAuthClients(filters)

    // Get statistics for each client
    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        // Count active tokens
        const { count: activeTokens } = await supabase
          .from('oauth_access_tokens')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', client.client_id)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString())

        // Count unique users
        const { data: uniqueUsers } = await supabase
          .from('oauth_access_tokens')
          .select('user_id')
          .eq('client_id', client.client_id)
          .is('revoked_at', null)

        const uniqueUserCount = uniqueUsers 
          ? new Set(uniqueUsers.map(u => u.user_id)).size 
          : 0

        // Get last token issued
        const { data: lastToken } = await supabase
          .from('oauth_access_tokens')
          .select('created_at')
          .eq('client_id', client.client_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          ...client,
          client_secret_hash: undefined, // Don't expose secret hash
          stats: {
            active_tokens: activeTokens || 0,
            unique_users: uniqueUserCount,
            last_token_issued: lastToken?.created_at || null,
          },
        }
      })
    )

    return NextResponse.json({ clients: clientsWithStats })
    
  } catch (error) {
    console.error('List OAuth clients error:', error)
    return NextResponse.json(
      { error: 'Failed to list OAuth clients' },
      { status: 500 }
    )
  }
}

// POST /api/oauth/clients - Create new OAuth client
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!userTenant || !['super_admin', 'admin'].includes(userTenant.role?.name)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      logo_url,
      homepage_url,
      redirect_uris,
      allowed_scopes,
      allowed_grant_types,
      token_expiration,
      refresh_token_expiration,
      is_first_party,
    } = body

    // Validate required fields
    if (!name || !redirect_uris || !allowed_scopes) {
      return NextResponse.json(
        { error: 'Missing required fields: name, redirect_uris, allowed_scopes' },
        { status: 400 }
      )
    }

    // Generate client credentials
    const credentials = generateClientCredentials()
    const clientSecretHash = await hashClientSecret(credentials.client_secret)

    // Create client
    const client = await createOAuthClient({
      client_id: credentials.client_id,
      client_secret_hash: clientSecretHash,
      name,
      description: description || null,
      logo_url: logo_url || null,
      homepage_url: homepage_url || null,
      redirect_uris: Array.isArray(redirect_uris) ? redirect_uris : [redirect_uris],
      allowed_scopes: Array.isArray(allowed_scopes) ? allowed_scopes : [allowed_scopes],
      allowed_grant_types: allowed_grant_types || ['authorization_code', 'refresh_token'],
      token_expiration: token_expiration || 3600,
      refresh_token_expiration: refresh_token_expiration || 2592000,
      is_active: true,
      is_first_party: is_first_party || false,
    })

    // Return client with credentials (only shown once!)
    return NextResponse.json({
      client: {
        ...client,
        client_secret_hash: undefined, // Don't expose hash
      },
      credentials: {
        client_id: credentials.client_id,
        client_secret: credentials.client_secret, // Only shown once!
      },
      warning: 'Save the client_secret now! It will not be shown again.',
    }, { status: 201 })
    
  } catch (error) {
    console.error('Create OAuth client error:', error)
    return NextResponse.json(
      { error: 'Failed to create OAuth client' },
      { status: 500 }
    )
  }
}
