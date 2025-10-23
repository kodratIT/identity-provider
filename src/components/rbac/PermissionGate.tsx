'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface PermissionGateProps {
  permissions: string | string[]
  requireAll?: boolean
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * @example
 * // Render if user has 'users.create' permission
 * <PermissionGate permissions="users.create">
 *   <CreateUserButton />
 * </PermissionGate>
 * 
 * // Render if user has ANY of the permissions
 * <PermissionGate permissions={['users.create', 'users.update']}>
 *   <UserActions />
 * </PermissionGate>
 * 
 * // Render if user has ALL permissions
 * <PermissionGate permissions={['users.create', 'users.delete']} requireAll>
 *   <AdminActions />
 * </PermissionGate>
 * 
 * // Show fallback when no permission
 * <PermissionGate permissions="users.create" fallback={<UpgradePrompt />}>
 *   <CreateUserButton />
 * </PermissionGate>
 */
export function PermissionGate({
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  if (loading) {
    return null // or return a loading skeleton
  }

  let hasAccess = false

  if (typeof permissions === 'string') {
    hasAccess = hasPermission(permissions)
  } else if (requireAll) {
    hasAccess = hasAllPermissions(permissions)
  } else {
    hasAccess = hasAnyPermission(permissions)
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
