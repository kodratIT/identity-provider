import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/tenants - List all tenants
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenants - user can only see tenants they belong to
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json(tenants)
  } catch (error: any) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}

// POST /api/tenants - Create new tenant
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, domain, subscription_tier } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingTenant) {
      return NextResponse.json(
        { error: 'A tenant with this slug already exists' },
        { status: 409 }
      )
    }

    // Create the tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name,
        slug,
        domain: domain || null,
        subscription_tier: subscription_tier || 'free',
        is_active: true,
      })
      .select()
      .single()

    if (tenantError) {
      throw tenantError
    }

    // Create default roles for the tenant using the database function
    const { error: rolesError } = await supabase.rpc('create_default_roles', {
      tenant_uuid: tenant.id,
    })

    if (rolesError) {
      console.error('Error creating default roles:', rolesError)
      // Don't fail the request, just log it
    }

    // Get the super_admin role
    const { data: superAdminRole } = await supabase
      .from('roles')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('name', 'super_admin')
      .single()

    // Assign the creator as super_admin of the new tenant
    if (superAdminRole) {
      const { error: userTenantError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: user.id,
          tenant_id: tenant.id,
          role_id: superAdminRole.id,
          is_active: true,
        })

      if (userTenantError) {
        console.error('Error assigning user to tenant:', userTenantError)
      }
    }

    return NextResponse.json(
      {
        message: 'Tenant created successfully',
        tenant,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create tenant' },
      { status: 500 }
    )
  }
}
