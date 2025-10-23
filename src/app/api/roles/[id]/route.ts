import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac/permissions'

// GET /api/roles/[id] - Get a specific role
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

    const { data: role, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error) throw error

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Count users with this role
    const { count } = await supabase
      .from('user_tenants')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', role.id)
      .eq('is_active', true)

    return NextResponse.json({
      ...role,
      user_count: count || 0,
    })
  } catch (error: any) {
    console.error('Error fetching role:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch role' },
      { status: 500 }
    )
  }
}

// PUT /api/roles/[id] - Update a role
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

    // Get existing role
    const { data: existingRole } = await supabase
      .from('roles')
      .select('tenant_id, is_system')
      .eq('id', id)
      .single()

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Check if it's a system role
    if (existingRole.is_system) {
      return NextResponse.json(
        { error: 'Cannot modify system roles' },
        { status: 403 }
      )
    }

    // Check if user is admin
    const isAdminUser = await isAdmin(user.id, existingRole.tenant_id)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { display_name, description, priority } = body

    // Update the role
    const { data: role, error } = await supabase
      .from('roles')
      .update({
        display_name: display_name || undefined,
        description: description !== undefined ? description : undefined,
        priority: priority !== undefined ? priority : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      message: 'Role updated successfully',
      role,
    })
  } catch (error: any) {
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update role' },
      { status: 500 }
    )
  }
}

// DELETE /api/roles/[id] - Delete a role
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

    // Get existing role
    const { data: existingRole } = await supabase
      .from('roles')
      .select('tenant_id, is_system')
      .eq('id', id)
      .single()

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Check if it's a system role
    if (existingRole.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system roles' },
        { status: 403 }
      )
    }

    // Check if user is admin
    const isAdminUser = await isAdmin(user.id, existingRole.tenant_id)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Check if role has users
    const { count } = await supabase
      .from('user_tenants')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id)
      .eq('is_active', true)

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role with active users. Reassign users first.' },
        { status: 409 }
      )
    }

    // Delete the role
    const { error } = await supabase.from('roles').delete().eq('id', id)

    if (error) throw error

    return NextResponse.json({
      message: 'Role deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete role' },
      { status: 500 }
    )
  }
}
