import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac/permissions'

// GET /api/roles?tenant_id=xxx - Get all roles for a tenant
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant_id from query params
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }

    // Get roles for this tenant
    const { data: roles, error } = await supabase
      .from('roles')
      .select(
        `
        *,
        role_permissions (
          permission_id,
          permissions (
            id,
            name,
            resource,
            action,
            description
          )
        )
      `
      )
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: false })

    if (error) throw error

    // Count users per role
    const rolesWithCount = await Promise.all(
      (roles || []).map(async (role) => {
        const { count } = await supabase
          .from('user_tenants')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)
          .eq('is_active', true)

        return {
          ...role,
          user_count: count || 0,
        }
      })
    )

    return NextResponse.json(rolesWithCount)
  } catch (error: any) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}

// POST /api/roles - Create a new role
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tenant_id, name, display_name, description, priority } = body

    // Validate required fields
    if (!tenant_id || !name || !display_name) {
      return NextResponse.json(
        { error: 'tenant_id, name, and display_name are required' },
        { status: 400 }
      )
    }

    // Check if user is admin in this tenant
    const isAdminUser = await isAdmin(user.id, tenant_id)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Check if role name already exists in this tenant
    const { data: existingRole } = await supabase
      .from('roles')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('name', name)
      .single()

    if (existingRole) {
      return NextResponse.json(
        { error: 'A role with this name already exists in this tenant' },
        { status: 409 }
      )
    }

    // Create the role
    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        tenant_id,
        name,
        display_name,
        description: description || null,
        is_system: false,
        priority: priority || 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(
      {
        message: 'Role created successfully',
        role,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create role' },
      { status: 500 }
    )
  }
}
