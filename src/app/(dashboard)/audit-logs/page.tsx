'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Search,
  Filter,
  Download,
  AlertCircle,
  User,
  Shield,
  Building2,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { PermissionGate } from '@/components/rbac/PermissionGate'

interface AuditLog {
  id: string
  user_id: string
  action: string
  resource: string
  resource_id: string | null
  metadata: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
  profiles?: {
    full_name: string
  }
}

export default function AuditLogsPage() {
  const { activeTenant } = useUser()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!activeTenant) return
    loadAuditLogs()
  }, [activeTenant])

  useEffect(() => {
    filterLogs()
  }, [logs, searchQuery, resourceFilter])

  async function loadAuditLogs() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .eq('tenant_id', activeTenant!.tenant_id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      setLogs(data || [])
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterLogs() {
    let filtered = logs

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Resource filter
    if (resourceFilter !== 'all') {
      filtered = filtered.filter((log) => log.resource === resourceFilter)
    }

    setFilteredLogs(filtered)
  }

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) return 'bg-green-100 text-green-800'
    if (action.includes('delete') || action.includes('remove')) return 'bg-red-100 text-red-800'
    if (action.includes('update') || action.includes('edit')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getResourceIcon = (resource: string) => {
    switch (resource.toLowerCase()) {
      case 'users':
        return <User className="h-4 w-4" />
      case 'roles':
        return <Shield className="h-4 w-4" />
      case 'tenants':
        return <Building2 className="h-4 w-4" />
      case 'settings':
        return <SettingsIcon className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const uniqueResources = Array.from(new Set(logs.map((log) => log.resource)))

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource', 'IP Address'].join(','),
      ...filteredLogs.map((log) =>
        [
          new Date(log.created_at).toLocaleString(),
          log.profiles?.full_name || 'Unknown',
          log.action,
          log.resource,
          log.ip_address || 'N/A',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <PermissionGate
      permissions="audit.read"
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">Access Denied</h3>
            <p className="mt-2 text-sm text-gray-500">
              You don't have permission to view audit logs
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-gray-500">Track all activities in your organization</p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-gray-500">last 100 events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  logs.filter(
                    (log) =>
                      new Date(log.created_at).toDateString() === new Date().toDateString()
                  ).length
                }
              </div>
              <p className="text-xs text-gray-500">events today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resources</CardTitle>
              <Filter className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueResources.length}</div>
              <p className="text-xs text-gray-500">resource types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <User className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(logs.map((log) => log.user_id)).size}
              </div>
              <p className="text-xs text-gray-500">active users</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and filter audit logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="flex h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Resources</option>
                {uniqueResources.map((resource) => (
                  <option key={resource} value={resource}>
                    {resource}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-gray-500">Loading audit logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No audit logs found</p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.profiles?.full_name || 'Unknown User'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getResourceIcon(log.resource)}
                            <span className="capitalize">{log.resource}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {log.ip_address || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {log.resource_id ? (
                            <span className="font-mono text-xs">{log.resource_id.slice(0, 8)}...</span>
                          ) : (
                            '—'
                          )}
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
    </PermissionGate>
  )
}
