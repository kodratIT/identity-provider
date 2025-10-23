'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ExternalLink, Users, Key, Activity, Settings, Trash2 } from 'lucide-react'

interface OAuthClient {
  id: string
  client_id: string
  name: string
  description: string | null
  logo_url: string | null
  homepage_url: string | null
  redirect_uris: string[]
  allowed_scopes: string[]
  allowed_grant_types: string[]
  token_expiration: number
  refresh_token_expiration: number
  is_active: boolean
  is_first_party: boolean
  created_at: string
  updated_at: string
}

interface ClientStats {
  total_tokens_issued: number
  active_tokens: number
  unique_users: number
  total_consents: number
}

export default function ApplicationDetailsPage({
  params,
}: {
  params: { clientId: string }
}) {
  const router = useRouter()
  const [client, setClient] = useState<OAuthClient | null>(null)
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadClientDetails()
  }, [params.clientId])

  const loadClientDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/oauth/clients/${params.clientId}`)
      if (response.ok) {
        const data = await response.json()
        setClient(data.client)
        setStats(data.stats)
      } else {
        router.push('/applications')
      }
    } catch (error) {
      console.error('Failed to load client details:', error)
      router.push('/applications')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!client) return

    try {
      const response = await fetch(`/api/oauth/clients/${params.clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !client.is_active,
        }),
      })

      if (response.ok) {
        loadClientDetails()
      }
    } catch (error) {
      console.error('Failed to toggle active status:', error)
    }
  }

  const handleDelete = async () => {
    if (!client) return
    
    const confirmed = confirm(
      `Are you sure you want to delete "${client.name}"? This action cannot be undone.`
    )
    
    if (!confirmed) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/oauth/clients/${params.clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/applications')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete application')
      }
    } catch (error) {
      console.error('Failed to delete client:', error)
      alert('Failed to delete application')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!client || !stats) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-start gap-4">
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt={client.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
                <Key className="h-8 w-8 text-blue-600" />
              </div>
            )}
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">{client.name}</h1>
                {client.is_first_party && (
                  <Badge variant="secondary">First Party</Badge>
                )}
                <Badge variant={client.is_active ? 'default' : 'secondary'}>
                  {client.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {client.description && (
                <p className="text-muted-foreground">{client.description}</p>
              )}
              {client.homepage_url && (
                <a
                  href={client.homepage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2"
                >
                  Visit website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={client.is_active ? 'outline' : 'default'}
            onClick={handleToggleActive}
          >
            {client.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens Issued</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_tokens_issued}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tokens</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_tokens}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unique_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Consents</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_consents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client ID</p>
              <p className="font-mono text-sm mt-1">{client.client_id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-sm mt-1">
                {new Date(client.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-sm mt-1">
                {new Date(client.updated_at).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* OAuth Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>OAuth Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Access Token Expiration</p>
              <p className="text-sm mt-1">{client.token_expiration} seconds</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Refresh Token Expiration</p>
              <p className="text-sm mt-1">{client.refresh_token_expiration} seconds</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Allowed Grant Types</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {client.allowed_grant_types.map((grant) => (
                  <Badge key={grant} variant="secondary">
                    {grant}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redirect URIs */}
        <Card>
          <CardHeader>
            <CardTitle>Redirect URIs</CardTitle>
            <CardDescription>
              Authorized callback URLs after authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {client.redirect_uris.map((uri, index) => (
                <li key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                  {uri}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Allowed Scopes */}
        <Card>
          <CardHeader>
            <CardTitle>Allowed Scopes</CardTitle>
            <CardDescription>
              Permissions this application can request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {client.allowed_scopes.map((scope) => (
                <Badge key={scope} variant="outline">
                  {scope}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
