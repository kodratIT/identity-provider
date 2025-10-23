import { createClient } from '@/lib/supabase/server'

/**
 * Check if a user has a specific permission within a tenant
 */
export async function hasPermission(
  userId: string,
  tenantId: string,
  permissionName: string
): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Call the database function
    const { data, error } = await supabase.rpc('has_permission', {
      user_uuid: userId,
      tenant_uuid: tenantId,
      permission_name: permissionName,
    })

    if (error) {
      console.error('Error checking permission:', error)
      return false
    }

    return data || false
  } catch (error) {
    console.error('Error in hasPermission:', error)
    return false
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  tenantId: string,
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    const result = await hasPermission(userId, tenantId, permission)
    if (result) return true
  }
  return false
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  tenantId: string,
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    const result = await hasPermission(userId, tenantId, permission)
    if (!result) return false
  }
  return true
}

/**
 * Get all permissions for a user in a tenant
 */
export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<string[]> {
  try {
    const supabase = await createClient()

    // Get user's role in this tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('role_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (!userTenant) return []

    // Get all permissions for this role
    const { data: rolePermissions } = await supabase
      .from('role_permissions')
      .select('permissions(name)')
      .eq('role_id', userTenant.role_id)

    if (!rolePermissions) return []

    return rolePermissions.map((rp: any) => rp.permissions.name)
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

/**
 * Get user's role in a tenant
 */
export async function getUserRole(userId: string, tenantId: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_tenants')
      .select(
        `
        role_id,
        roles (
          id,
          name,
          display_name,
          priority
        )
      `
      )
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (error) throw error

    const roles = data?.roles as any
    return Array.isArray(roles) ? roles[0] : roles
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

/**
 * Check if user has a specific role
 */
export async function hasRole(
  userId: string,
  tenantId: string,
  roleName: string
): Promise<boolean> {
  try {
    const role = await getUserRole(userId, tenantId)
    return role?.name === roleName
  } catch (error) {
    console.error('Error checking role:', error)
    return false
  }
}

/**
 * Check if user is an admin (super_admin or admin)
 */
export async function isAdmin(userId: string, tenantId: string): Promise<boolean> {
  try {
    const role = await getUserRole(userId, tenantId)
    return role?.name === 'super_admin' || role?.name === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string, tenantId: string): Promise<boolean> {
  try {
    const role = await getUserRole(userId, tenantId)
    return role?.name === 'super_admin'
  } catch (error) {
    console.error('Error checking super admin status:', error)
    return false
  }
}
