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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, MoreHorizontal, Plus, Search } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  domain: string | null
  subscription_tier: string
  is_active: boolean
  created_at: string
  user_count?: number
}

export default function TenantsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadTenants() {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        // Get user counts for each tenant
        const tenantsWithCounts = await Promise.all(
          (data || []).map(async (tenant) => {
            const { count } = await supabase
              .from('user_tenants')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_id', tenant.id)
              .eq('is_active', true)

            return {
              ...tenant,
              user_count: count || 0,
            }
          })
        )

        setTenants(tenantsWithCounts)
      } catch (error) {
        console.error('Error loading tenants:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTenants()
  }, [supabase])

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-gray-500">
            Manage schools and organizations
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-gray-500">organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants.filter(t => t.is_active).length}
            </div>
            <p className="text-xs text-gray-500">currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants.reduce((sum, t) => sum + (t.user_count || 0), 0)}
            </div>
            <p className="text-xs text-gray-500">across all tenants</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            View and manage all tenant organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-gray-500">Loading tenants...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">No tenants found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchQuery ? 'Try adjusting your search' : 'Get started by adding a tenant'}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-sm text-gray-500">{tenant.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.domain || <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{tenant.user_count || 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {tenant.subscription_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tenant.is_active ? 'default' : 'secondary'}
                          className={tenant.is_active ? 'bg-green-600' : ''}
                        >
                          {tenant.is_active ? 'Active' : 'Inactive'}
                        </Badge>
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
                            <DropdownMenuItem>Edit Tenant</DropdownMenuItem>
                            <DropdownMenuItem>Manage Users</DropdownMenuItem>
                            <DropdownMenuItem>View Settings</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Deactivate Tenant
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
