'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useUser } from './useUser'

interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description: string | null
}

export function usePermissions() {
  const { user } = useAuth()
  const { activeTenant } = useUser()
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user || !activeTenant) {
      setPermissions([])
      setLoading(false)
      return
    }

    async function loadPermissions() {
      try {
        // Get user's role in this tenant
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('role_id')
          .eq('user_id', user!.id)
          .eq('tenant_id', activeTenant!.tenant_id)
          .eq('is_active', true)
          .single()

        if (!userTenant) {
          setPermissions([])
          return
        }

        // Get all permissions for this role
        const { data: rolePermissions } = await supabase
          .from('role_permissions')
          .select('permissions(name)')
          .eq('role_id', userTenant.role_id)

        if (rolePermissions) {
          const permissionNames = rolePermissions.map((rp: any) => rp.permissions.name)
          setPermissions(permissionNames)
        }
      } catch (error) {
        console.error('Error loading permissions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [user, activeTenant, supabase])

  const hasPermission = (permissionName: string): boolean => {
    return permissions.includes(permissionName)
  }

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return permissionNames.some((name) => permissions.includes(name))
  }

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    return permissionNames.every((name) => permissions.includes(name))
  }

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}

/**
 * Component wrapper for permission-based rendering
 */
export function usePermissionCheck(permissionName: string | string[]) {
  const { hasPermission, hasAnyPermission } = usePermissions()

  if (Array.isArray(permissionName)) {
    return hasAnyPermission(permissionName)
  }

  return hasPermission(permissionName)
}
