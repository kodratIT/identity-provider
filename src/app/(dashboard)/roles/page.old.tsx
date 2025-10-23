'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Shield, Users, Lock, MoreHorizontal, Loader2, AlertCircle } from 'lucide-react'
import { useRoles } from '@/hooks/useRoles'
import { CreateRoleDialog } from '@/components/rbac/CreateRoleDialog'
import { PermissionMatrix } from '@/components/rbac/PermissionMatrix'
import { PermissionGate } from '@/components/rbac/PermissionGate'

export default function RolesPage() {
  const { roles, loading, deleteRole } = useRoles()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return

    setDeleting(roleId)
    try {
      await deleteRole(roleId)
      if (selectedRole === roleId) {
        setSelectedRole(null)
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete role')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }
          .from('roles')
          .select('*')
          .eq('tenant_id', activeTenant!.tenant_id)
          .order('priority', { ascending: false })

        if (rolesError) throw rolesError

        // Get user counts for each role
        const rolesWithCounts = await Promise.all(
          (rolesData || []).map(async (role) => {
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

        setRoles(rolesWithCounts)

        // Load all permissions
        const { data: permData, error: permError } = await supabase
          .from('permissions')
          .select('*')
          .order('resource', { ascending: true })

        if (permError) throw permError

        setPermissions(permData || [])
      } catch (error) {
        console.error('Error loading roles:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRolesAndPermissions()
  }, [activeTenant, supabase])

  if (!activeTenant) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">No Tenant Selected</h3>
          <p className="mt-2 text-sm text-gray-500">
            Please select a tenant to view roles.
          </p>
        </div>
      </div>
    )
  }

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-gray-500">
            Manage access control for {activeTenant.tenant_name}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-gray-500">in this tenant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Roles</CardTitle>
            <Lock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.filter(r => r.is_system).length}
            </div>
            <p className="text-xs text-gray-500">built-in roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
            <p className="text-xs text-gray-500">system-wide</p>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle>Roles in {activeTenant.tenant_name}</CardTitle>
          <CardDescription>
            Manage roles and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-gray-500">Loading roles...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <div className="text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">No roles found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create your first role to get started
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{role.display_name}</h3>
                        {role.is_system && (
                          <Badge variant="secondary">System</Badge>
                        )}
                        <Badge variant="outline">
                          Priority: {role.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {role.description || 'No description'}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <Users className="h-3 w-3" />
                        <span>{role.user_count || 0} users</span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Role</DropdownMenuItem>
                      <DropdownMenuItem>Manage Permissions</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        disabled={role.is_system}
                      >
                        Delete Role
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>System Permissions</CardTitle>
          <CardDescription>
            Available permissions across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-gray-500">Loading permissions...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(permissionsByResource).map(([resource, perms]) => (
                <div key={resource}>
                  <h3 className="mb-3 text-sm font-semibold uppercase text-gray-700">
                    {resource}
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {perms.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-center gap-2 rounded-md border p-3"
                      >
                        <Lock className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{perm.action}</p>
                          <p className="text-xs text-gray-500">
                            {perm.description || perm.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
