'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MoreHorizontal, Search, UserPlus, Mail, Shield } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

interface UserData {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role_name: string
  is_active: boolean
  joined_at: string
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const { activeTenant } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!activeTenant) return

    async function loadUsers() {
      try {
        const { data, error } = await supabase
          .from('user_tenants')
          .select(`
            user_id,
            is_active,
            joined_at,
            profiles (
              id,
              full_name,
              avatar_url
            ),
            roles (
              name
            )
          `)
          .eq('tenant_id', activeTenant!.tenant_id)

        if (error) throw error

        // Get emails from auth.users metadata
        const userIds = data?.map((ut: any) => ut.user_id) || []
        const { data: authUsers } = await supabase.auth.admin.listUsers()

        const formattedUsers: UserData[] = (data || []).map((ut: any) => {
          const authUser = authUsers?.users?.find((u: any) => u.id === ut.user_id)
          return {
            id: ut.user_id,
            email: authUser?.email || 'N/A',
            full_name: ut.profiles?.full_name || 'N/A',
            avatar_url: ut.profiles?.avatar_url || null,
            role_name: ut.roles?.name || 'No Role',
            is_active: ut.is_active,
            joined_at: ut.joined_at,
          }
        })

        setUsers(formattedUsers)
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [activeTenant, supabase])

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!activeTenant) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">No Tenant Selected</h3>
          <p className="mt-2 text-sm text-gray-500">
            Please select a tenant to view users.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-gray-500">
            Manage users in {activeTenant.tenant_name}
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-gray-500">in this tenant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.is_active).length}
            </div>
            <p className="text-xs text-gray-500">currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role_name.includes('admin')).length}
            </div>
            <p className="text-xs text-gray-500">with admin role</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Search and manage users in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <div className="text-center">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">No users found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchQuery ? 'Try adjusting your search' : 'Get started by adding a user'}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.is_active ? 'default' : 'secondary'}
                          className={user.is_active ? 'bg-green-600' : ''}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.joined_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
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
                            <DropdownMenuItem>Edit User</DropdownMenuItem>
                            <DropdownMenuItem>Change Role</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Remove from Tenant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
