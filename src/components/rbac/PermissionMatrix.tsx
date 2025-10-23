'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Save, X } from 'lucide-react'
import { useRoles } from '@/hooks/useRoles'
import { createClient } from '@/lib/supabase/client'

interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description: string | null
}

interface Role {
  id: string
  name: string
  display_name: string
  is_system: boolean
  role_permissions?: Array<{
    permission_id: string
  }>
}

interface PermissionMatrixProps {
  roleId: string
  roleName: string
  isSystem: boolean
}

export function PermissionMatrix({ roleId, roleName, isSystem }: PermissionMatrixProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { assignPermissions, loadRoles } = useRoles()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [roleId])

  async function loadData() {
    try {
      setLoading(true)

      // Load all permissions
      const { data: permsData } = await supabase.from('permissions').select('*').order('resource')

      // Load current role permissions
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId)

      setPermissions(permsData || [])

      const selected = new Set((rolePerms || []).map((rp) => rp.permission_id))
      setSelectedPermissions(selected)
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permissionId: string) => {
    if (isSystem) return // Can't modify system roles

    const newSelected = new Set(selectedPermissions)
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId)
    } else {
      newSelected.add(permissionId)
    }
    setSelectedPermissions(newSelected)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await assignPermissions(roleId, Array.from(selectedPermissions))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    loadData()
  }

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc: any, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {})

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Permission Matrix: {roleName}</CardTitle>
            <CardDescription>
              {isSystem
                ? 'System roles cannot be modified'
                : 'Select permissions for this role'}
            </CardDescription>
          </div>
          {!isSystem && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-3">
            <p className="text-sm text-green-800">Permissions saved successfully!</p>
          </div>
        )}

        {Object.entries(groupedPermissions).map(([resource, perms]: [string, any]) => (
          <div key={resource} className="space-y-2">
            <h3 className="font-medium capitalize">{resource} Permissions</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {perms.map((perm: Permission) => (
                <label
                  key={perm.id}
                  className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedPermissions.has(perm.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isSystem ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.has(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    disabled={isSystem}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{perm.action}</p>
                      <Badge variant="secondary" className="text-xs">
                        {perm.name}
                      </Badge>
                    </div>
                    {perm.description && (
                      <p className="text-xs text-gray-500 mt-1">{perm.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(groupedPermissions).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No permissions available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
