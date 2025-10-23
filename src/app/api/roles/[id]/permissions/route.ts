import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/rbac/permissions'

// POST /api/roles/[id]/permissions - Assign permissions to a role
export async function POST(request: Request, { params }: { params: { id: string } }) {
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
    const { permission_ids } = body

    if (!permission_ids || !Array.isArray(permission_ids)) {
      return NextResponse.json(
        { error: 'permission_ids array is required' },
        { status: 400 }
      )
    }

    // Get role to check tenant
    const { data: role } = await supabase
      .from('roles')
      .select('tenant_id, is_system')
      .eq('id', params.id)
      .single()

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Check if it's a system role
    if (role.is_system) {
      return NextResponse.json(
        { error: 'Cannot modify permissions for system roles' },
        { status: 403 }
      )
    }

    // Check if user is admin
    const isAdminUser = await isAdmin(user.id, role.tenant_id)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Delete existing permissions for this role
    await supabase.from('role_permissions').delete().eq('role_id', params.id)

    // Insert new permissions
    if (permission_ids.length > 0) {
      const rolePermissions = permission_ids.map((permissionId: string) => ({
        role_id: params.id,
        permission_id: permissionId,
      }))

      const { error } = await supabase.from('role_permissions').insert(rolePermissions)

      if (error) throw error
    }

    return NextResponse.json({
      message: 'Permissions assigned successfully',
    })
  } catch (error: any) {
    console.error('Error assigning permissions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign permissions' },
      { status: 500 }
    )
  }
}

// DELETE /api/roles/[id]/permissions - Remove all permissions from a role
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    // Get role to check tenant
    const { data: role } = await supabase
      .from('roles')
      .select('tenant_id, is_system')
      .eq('id', params.id)
      .single()

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Check if it's a system role
    if (role.is_system) {
      return NextResponse.json(
        { error: 'Cannot modify permissions for system roles' },
        { status: 403 }
      )
    }

    // Check if user is admin
    const isAdminUser = await isAdmin(user.id, role.tenant_id)
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Delete all permissions for this role
    const { error } = await supabase.from('role_permissions').delete().eq('role_id', params.id)

    if (error) throw error

    return NextResponse.json({
      message: 'All permissions removed successfully',
    })
  } catch (error: any) {
    console.error('Error removing permissions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove permissions' },
      { status: 500 }
    )
  }
}
