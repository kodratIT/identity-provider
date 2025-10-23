'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import { OAUTH_SCOPES } from '@/types/oauth.types'

interface RegisterApplicationDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RegisterApplicationDialog({
  open,
  onClose,
  onSuccess,
}: RegisterApplicationDialogProps) {
  const [step, setStep] = useState<'form' | 'credentials'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [homepageUrl, setHomepageUrl] = useState('')
  const [redirectUris, setRedirectUris] = useState<string[]>([''])
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['openid', 'profile', 'email'])
  const [isFirstParty, setIsFirstParty] = useState(false)
  
  // Generated credentials
  const [credentials, setCredentials] = useState<{
    client_id: string
    client_secret: string
  } | null>(null)
  const [copiedField, setCopiedField] = useState<'id' | 'secret' | null>(null)

  const handleAddRedirectUri = () => {
    setRedirectUris([...redirectUris, ''])
  }

  const handleRemoveRedirectUri = (index: number) => {
    setRedirectUris(redirectUris.filter((_, i) => i !== index))
  }

  const handleRedirectUriChange = (index: number, value: string) => {
    const updated = [...redirectUris]
    updated[index] = value
    setRedirectUris(updated)
  }

  const toggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope))
    } else {
      setSelectedScopes([...selectedScopes, scope])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Filter out empty redirect URIs
      const validRedirectUris = redirectUris.filter(uri => uri.trim() !== '')

      if (validRedirectUris.length === 0) {
        setError('At least one redirect URI is required')
        setLoading(false)
        return
      }

      if (selectedScopes.length === 0) {
        setError('At least one scope must be selected')
        setLoading(false)
        return
      }

      const response = await fetch('/api/oauth/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          logo_url: logoUrl || null,
          homepage_url: homepageUrl || null,
          redirect_uris: validRedirectUris,
          allowed_scopes: selectedScopes,
          is_first_party: isFirstParty,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to register application')
      }

      const data = await response.json()
      setCredentials(data.credentials)
      setStep('credentials')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (field: 'id' | 'secret') => {
    if (!credentials) return
    
    const text = field === 'id' ? credentials.client_id : credentials.client_secret
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleClose = () => {
    if (step === 'credentials') {
      onSuccess()
    }
    // Reset form
    setStep('form')
    setName('')
    setDescription('')
    setLogoUrl('')
    setHomepageUrl('')
    setRedirectUris([''])
    setSelectedScopes(['openid', 'profile', 'email'])
    setIsFirstParty(false)
    setCredentials(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Register New Application</DialogTitle>
              <DialogDescription>
                Create a new OAuth 2.0 client application to integrate with your system
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Basic Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Application Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Application"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this application do?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="homepageUrl">Homepage URL</Label>
                    <Input
                      id="homepageUrl"
                      value={homepageUrl}
                      onChange={(e) => setHomepageUrl(e.target.value)}
                      placeholder="https://example.com"
                      type="url"
                    />
                  </div>
                </div>
              </div>

              {/* Redirect URIs */}
              <div className="space-y-4">
                <h3 className="font-semibold">Redirect URIs *</h3>
                <p className="text-sm text-muted-foreground">
                  Authorized redirect URIs for your application after authorization
                </p>
                
                {redirectUris.map((uri, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={uri}
                      onChange={(e) => handleRedirectUriChange(index, e.target.value)}
                      placeholder="https://example.com/callback"
                      required
                    />
                    {redirectUris.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleRemoveRedirectUri(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRedirectUri}
                >
                  Add Redirect URI
                </Button>
              </div>

              {/* Scopes */}
              <div className="space-y-4">
                <h3 className="font-semibold">Allowed Scopes *</h3>
                <p className="text-sm text-muted-foreground">
                  Select which scopes this application can request
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(OAUTH_SCOPES).map(([scope, description]) => (
                    <div key={scope} className="flex items-start gap-2">
                      <Checkbox
                        id={`scope-${scope}`}
                        checked={selectedScopes.includes(scope)}
                        onCheckedChange={() => toggleScope(scope)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`scope-${scope}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {scope}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isFirstParty"
                    checked={isFirstParty}
                    onCheckedChange={(checked) => setIsFirstParty(checked as boolean)}
                  />
                  <Label htmlFor="isFirstParty" className="cursor-pointer">
                    First-party application (owned by you)
                  </Label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Registering...' : 'Register Application'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Application Registered Successfully!</DialogTitle>
              <DialogDescription>
                Save these credentials now. The client secret will not be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Warning */}
              <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Important!</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      Make sure to copy your client secret now. You won't be able to see it again!
                    </p>
                  </div>
                </div>
              </div>

              {/* Client ID */}
              <div className="space-y-2">
                <Label>Client ID</Label>
                <div className="flex gap-2">
                  <Input
                    value={credentials?.client_id || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopy('id')}
                  >
                    {copiedField === 'id' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Client Secret */}
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <div className="flex gap-2">
                  <Input
                    value={credentials?.client_secret || ''}
                    readOnly
                    className="font-mono text-sm"
                    type="password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopy('secret')}
                  >
                    {copiedField === 'secret' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
