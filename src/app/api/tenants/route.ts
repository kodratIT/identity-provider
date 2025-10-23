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

    // Get user's tenants (tenants they belong to)
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select('tenant_id, roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (userTenantsError) {
      throw userTenantsError
    }

    const tenantIds = userTenants.map((ut: any) => ut.tenant_id)
    const isSuperAdmin = userTenants.some((ut: any) => {
      const roles = ut.roles as any
      const roleName = Array.isArray(roles) ? roles[0]?.name : roles?.name
      return roleName === 'super_admin'
    })

    // If super admin, fetch all tenants; otherwise only user's tenants
    let query = supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (!isSuperAdmin && tenantIds.length > 0) {
      query = query.in('id', tenantIds)
    } else if (!isSuperAdmin) {
      // User has no tenants
      return NextResponse.json([])
    }

    const { data: tenants, error } = await query

    if (error) {
      throw error
    }

    // Get user counts for each tenant
    const tenantsWithCounts = await Promise.all(
      (tenants || []).map(async (tenant) => {
        const { count } = await supabase
          .from('user_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)

        return {
          ...tenant,
          user_count: count || 0,
        }
      })
    )

    return NextResponse.json(tenantsWithCounts)
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
