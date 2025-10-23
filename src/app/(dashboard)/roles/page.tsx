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
import { Shield, Users, Lock, MoreHorizontal, Loader2, AlertCircle, Settings } from 'lucide-react'
import { useRoles } from '@/hooks/useRoles'
import { CreateRoleDialog } from '@/components/rbac/CreateRoleDialog'
import { PermissionMatrix } from '@/components/rbac/PermissionMatrix'
import { PermissionGate } from '@/components/rbac/PermissionGate'

export default function RolesPage() {
  const { roles, loading, deleteRole } = useRoles()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? Users with this role will need to be reassigned.')) return

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

  const selectedRoleData = roles.find((r) => r.id === selectedRole)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-gray-500">Manage roles and their permissions</p>
        </div>
        <PermissionGate permissions="roles.create">
          <CreateRoleDialog />
        </PermissionGate>
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
            <p className="text-xs text-gray-500">across your organization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Roles</CardTitle>
            <Lock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.filter((r) => r.is_system).length}
            </div>
            <p className="text-xs text-gray-500">protected roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles.filter((r) => !r.is_system).length}
            </div>
            <p className="text-xs text-gray-500">customizable</p>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Select a role to manage its permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`w-full text-left rounded-lg border p-4 transition-colors ${
                    selectedRole === role.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{role.display_name}</h3>
                        {role.is_system && (
                          <Badge variant="secondary" className="text-xs">
                            System
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{role.name}</p>
                      {role.description && (
                        <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <Users className="mr-1 h-3 w-3" />
                          {role.user_count || 0} users
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Lock className="mr-1 h-3 w-3" />
                          {role.role_permissions?.length || 0} permissions
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          Priority: {role.priority}
                        </div>
                      </div>
                    </div>

                    {!role.is_system && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRole(role.id)
                            }}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Manage Permissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            disabled={deleting === role.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteRole(role.id)
                            }}
                          >
                            {deleting === role.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Delete Role
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </button>
              ))}

              {roles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No roles found</h3>
                  <p className="mt-2 text-sm">Create your first custom role</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permission Matrix */}
        <div>
          {selectedRoleData ? (
            <PermissionMatrix
              roleId={selectedRoleData.id}
              roleName={selectedRoleData.display_name}
              isSystem={selectedRoleData.is_system}
            />
          ) : (
            <Card>
              <CardContent className="flex h-full min-h-[400px] items-center justify-center">
                <div className="text-center text-gray-500">
                  <Lock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No role selected</h3>
                  <p className="mt-2 text-sm">Select a role to manage its permissions</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
