import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getOAuthClient,
  updateOAuthClient,
  deleteOAuthClient,
} from '@/lib/oauth/adapter'

// GET /api/oauth/clients/:clientId - Get client details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
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
      .select('role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    const roleName = (userTenant?.roles as any)?.[0]?.name || (userTenant?.roles as any)?.name
    if (!userTenant || !['super_admin', 'admin'].includes(roleName)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const client = await getOAuthClient(clientId)
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Get statistics
    const { count: totalTokens } = await supabase
      .from('oauth_access_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.client_id)

    const { count: activeTokens } = await supabase
      .from('oauth_access_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.client_id)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())

    const { data: users } = await supabase
      .from('oauth_access_tokens')
      .select('user_id, user:profiles(full_name)')
      .eq('client_id', client.client_id)
      .is('revoked_at', null)

    const uniqueUsers = users ? new Set(users.map(u => u.user_id)).size : 0

    const { data: consents } = await supabase
      .from('oauth_user_consents')
      .select('*')
      .eq('client_id', client.client_id)

    return NextResponse.json({
      client: {
        ...client,
        client_secret_hash: undefined, // Don't expose hash
      },
      stats: {
        total_tokens_issued: totalTokens || 0,
        active_tokens: activeTokens || 0,
        unique_users: uniqueUsers,
        total_consents: consents?.length || 0,
      },
    })
    
  } catch (error) {
    console.error('Get OAuth client error:', error)
    return NextResponse.json(
      { error: 'Failed to get OAuth client' },
      { status: 500 }
    )
  }
}

// PUT /api/oauth/clients/:clientId - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
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
      .select('role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    const roleName = (userTenant?.roles as any)?.[0]?.name || (userTenant?.roles as any)?.name
    if (!userTenant || !['super_admin', 'admin'].includes(roleName)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Don't allow updating client_id or client_secret
    const {
      client_id,
      client_secret_hash,
      ...updateData
    } = body

    const updatedClient = await updateOAuthClient(clientId, updateData)

    return NextResponse.json({
      client: {
        ...updatedClient,
        client_secret_hash: undefined,
      },
    })
    
  } catch (error) {
    console.error('Update OAuth client error:', error)
    return NextResponse.json(
      { error: 'Failed to update OAuth client' },
      { status: 500 }
    )
  }
}

// DELETE /api/oauth/clients/:clientId - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is super admin (only super admins can delete)
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    const roleName = (userTenant?.roles as any)?.[0]?.name || (userTenant?.roles as any)?.name
    if (!userTenant || roleName !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only super admins can delete clients.' },
        { status: 403 }
      )
    }

    await deleteOAuthClient(clientId)

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Delete OAuth client error:', error)
    return NextResponse.json(
      { error: 'Failed to delete OAuth client' },
      { status: 500 }
    )
  }
}
