import { createClient } from '@/lib/supabase/server'

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return false
    }

    // Check if user has super_admin role in any tenant
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (!userTenants || userTenants.length === 0) {
      return false
    }

    // Check if any role is super_admin
    return userTenants.some((ut: any) => ut.role?.name === 'super_admin')
  } catch (error) {
    console.error('Error checking super admin status:', error)
    return false
  }
}

/**
 * Require super admin access - throws error if not super admin
 */
export async function requireSuperAdmin(): Promise<void> {
  const isAdmin = await isSuperAdmin()
  if (!isAdmin) {
    throw new Error('Super admin access required')
  }
}

/**
 * Get current user with super admin check
 */
export async function getSuperAdminUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Not authenticated')
  }

  const isAdmin = await isSuperAdmin()
  if (!isAdmin) {
    throw new Error('Super admin access required')
  }

  return user
}
