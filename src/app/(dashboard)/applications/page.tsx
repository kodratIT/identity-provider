'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ExternalLink, Settings, Users, Key, Activity } from 'lucide-react'
import { RegisterApplicationDialog } from '@/components/applications/RegisterApplicationDialog'

interface OAuthClient {
  id: string
  client_id: string
  name: string
  description: string | null
  logo_url: string | null
  homepage_url: string | null
  is_active: boolean
  is_first_party: boolean
  created_at: string
  stats: {
    active_tokens: number
    unique_users: number
    last_token_issued: string | null
  }
}

export default function ApplicationsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<OAuthClient[]>([])
  const [loading, setLoading] = useState(true)
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    loadClients()
  }, [filter])

  const loadClients = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter === 'active') params.set('is_active', 'true')
      if (filter === 'inactive') params.set('is_active', 'false')

      const response = await fetch(`/api/oauth/clients?${params}`)
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients)
      }
    } catch (error) {
      console.error('Failed to load clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSuccess = () => {
    setShowRegisterDialog(false)
    loadClients()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="text-muted-foreground mt-2">
            Manage OAuth 2.0 client applications
          </p>
        </div>
        <Button onClick={() => setShowRegisterDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Register Application
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((sum, c) => sum + c.stats.unique_users, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tokens</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((sum, c) => sum + c.stats.active_tokens, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filter === 'inactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('inactive')}
        >
          Inactive
        </Button>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Applications</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by registering your first application
            </p>
            <Button onClick={() => setShowRegisterDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Register Application
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/applications/${client.client_id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt={client.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Key className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      {client.is_first_party && (
                        <Badge variant="secondary" className="mt-1">
                          First Party
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={client.is_active ? 'default' : 'secondary'}>
                    {client.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {client.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {client.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Users</span>
                    <span className="font-medium">{client.stats.unique_users}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Active Tokens</span>
                    <span className="font-medium">{client.stats.active_tokens}</span>
                  </div>
                  {client.stats.last_token_issued && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last Used</span>
                      <span className="font-medium text-xs">
                        {new Date(client.stats.last_token_issued).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {client.homepage_url && (
                  <div className="pt-2 border-t">
                    <a
                      href={client.homepage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Visit website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Register Dialog */}
      <RegisterApplicationDialog
        open={showRegisterDialog}
        onClose={() => setShowRegisterDialog(false)}
        onSuccess={handleRegisterSuccess}
      />
    </div>
  )
}
