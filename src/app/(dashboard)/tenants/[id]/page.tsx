'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  slug: string
  domain: string | null
  logo_url: string | null
  subscription_tier: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function TenantDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = params.id as string
  const supabase = createClient()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    logo_url: '',
    subscription_tier: 'free',
  })

  useEffect(() => {
    loadTenant()
  }, [tenantId])

  async function loadTenant() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (error) throw error

      setTenant(data)
      setFormData({
        name: data.name,
        domain: data.domain || '',
        logo_url: data.logo_url || '',
        subscription_tier: data.subscription_tier,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          domain: formData.domain || null,
          logo_url: formData.logo_url || null,
          subscription_tier: formData.subscription_tier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId)

      if (error) throw error

      setSuccess('Tenant updated successfully!')
      await loadTenant()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus() {
    if (!tenant) return

    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          is_active: !tenant.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId)

      if (error) throw error

      setSuccess(`Tenant ${tenant.is_active ? 'deactivated' : 'activated'} successfully!`)
      await loadTenant()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tenant Not Found</h1>
          </div>
        </div>
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">Tenant not found</h3>
              <p className="mt-2 text-sm text-gray-500">
                The tenant you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button className="mt-4" onClick={() => router.push('/dashboard/tenants')}>
                Back to Tenants
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
            <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
              {tenant.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-gray-500">Manage tenant settings and configuration</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update tenant details and settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Tenant Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (Read-only)</Label>
              <Input id="slug" value={tenant.slug} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="e.g., example.edu"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription_tier">Subscription Tier</Label>
              <select
                id="subscription_tier"
                value={formData.subscription_tier}
                onChange={(e) =>
                  setFormData({ ...formData, subscription_tier: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                placeholder="https://example.com/logo.png"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>
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
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
          <CardDescription>Tenant information and timestamps</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{tenant.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(tenant.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(tenant.updated_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions for this tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
            <div>
              <h4 className="font-medium">
                {tenant.is_active ? 'Deactivate Tenant' : 'Activate Tenant'}
              </h4>
              <p className="text-sm text-gray-600">
                {tenant.is_active
                  ? 'Users will not be able to access this tenant'
                  : 'Enable access to this tenant'}
              </p>
            </div>
            <Button
              variant={tenant.is_active ? 'destructive' : 'default'}
              onClick={handleToggleStatus}
              disabled={saving}
            >
              {tenant.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
            <div>
              <h4 className="font-medium">Delete Tenant</h4>
              <p className="text-sm text-gray-600">
                Permanently delete this tenant and all associated data
              </p>
            </div>
            <Button variant="destructive" disabled>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
