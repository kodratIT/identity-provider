'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './useUser'

interface Role {
  id: string
  tenant_id: string
  name: string
  display_name: string
  description: string | null
  is_system: boolean
  priority: number
  created_at: string
  updated_at: string
  user_count?: number
  role_permissions?: Array<{
    permission_id: string
    permissions: {
      id: string
      name: string
      resource: string
      action: string
      description: string | null
    }
  }>
}

export function useRoles() {
  const { activeTenant } = useUser()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!activeTenant) {
      setRoles([])
      setLoading(false)
      return
    }

    loadRoles()
  }, [activeTenant])

  async function loadRoles() {
    try {
      setLoading(true)

      const { data, error } = await supabase
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
        .eq('tenant_id', activeTenant!.tenant_id)
        .order('priority', { ascending: false })

      if (error) throw error

      // Count users per role
      const rolesWithCount = await Promise.all(
        (data || []).map(async (role) => {
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

      setRoles(rolesWithCount)
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const createRole = async (roleData: {
    name: string
    display_name: string
    description?: string
    priority?: number
  }) => {
    if (!activeTenant) throw new Error('No active tenant')

    const response = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: activeTenant.tenant_id,
        ...roleData,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create role')
    }

    await loadRoles()
    return response.json()
  }

  const updateRole = async (roleId: string, updates: Partial<Role>) => {
    const response = await fetch(`/api/roles/${roleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update role')
    }

    await loadRoles()
    return response.json()
  }

  const deleteRole = async (roleId: string) => {
    const response = await fetch(`/api/roles/${roleId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete role')
    }

    await loadRoles()
    return response.json()
  }

  const assignPermissions = async (roleId: string, permissionIds: string[]) => {
    const response = await fetch(`/api/roles/${roleId}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission_ids: permissionIds }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to assign permissions')
    }

    await loadRoles()
    return response.json()
  }

  return {
    roles,
    loading,
    loadRoles,
    createRole,
    updateRole,
    deleteRole,
    assignPermissions,
  }
}
