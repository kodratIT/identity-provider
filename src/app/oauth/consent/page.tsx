import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOAuthClient } from '@/lib/oauth/adapter'
import { parseScopes } from '@/lib/oauth/utils'
import { OAUTH_SCOPES } from '@/types/oauth.types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ConsentPageProps {
  searchParams: Promise<{
    client_id: string
    redirect_uri: string
    scope: string
    state?: string
    code_challenge?: string
    code_challenge_method?: string
    tenant_id: string
  }>
}

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams
  const {
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
    tenant_id,
  } = params

  // Check authentication
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect(`/login?redirect=${encodeURIComponent(`/oauth/consent?${new URLSearchParams(searchParams as any).toString()}`)}`)
  }

  // Get client information
  const client = await getOAuthClient(client_id)
  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Request</CardTitle>
            <CardDescription>The application requesting access is not recognized.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Get tenant information
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenant_id)
    .single()

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Parse requested scopes
  const requestedScopes = parseScopes(scope)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          {client.logo_url && (
            <div className="mb-4 flex justify-center">
              <img 
                src={client.logo_url} 
                alt={client.name}
                className="h-16 w-16 rounded-lg object-contain"
              />
            </div>
          )}
          <CardTitle className="text-2xl">Authorize Application</CardTitle>
          <CardDescription>
            <strong>{client.name}</strong> is requesting access to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-sm text-gray-600">You are logged in as:</p>
            <p className="font-medium">{profile?.full_name || user.email}</p>
            {tenant && (
              <p className="text-sm text-gray-600">
                School: <span className="font-medium">{tenant.name}</span>
              </p>
            )}
          </div>

          {/* Application Info */}
          {client.description && (
            <div>
              <h3 className="mb-2 text-sm font-medium">About this application</h3>
              <p className="text-sm text-gray-600">{client.description}</p>
              {client.homepage_url && (
                <a 
                  href={client.homepage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Visit website →
                </a>
              )}
            </div>
          )}

          {/* Requested Permissions */}
          <div>
            <h3 className="mb-3 text-sm font-medium">This application will be able to:</h3>
            <ul className="space-y-2">
              {requestedScopes.map((scopeKey) => (
                <li key={scopeKey} className="flex items-start gap-2 text-sm">
                  <svg
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <Badge variant="outline" className="mb-1 text-xs">
                      {scopeKey}
                    </Badge>
                    <p className="text-gray-600">
                      {OAUTH_SCOPES[scopeKey as keyof typeof OAUTH_SCOPES] || scopeKey}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Warning for third-party apps */}
          {!client.is_first_party && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex gap-2">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Third-party application</p>
                  <p className="text-sm text-yellow-700">
                    This application is not maintained by your school. Only authorize if you trust this application.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <form action="/api/oauth/authorize" method="POST" className="space-y-3">
            <input type="hidden" name="client_id" value={client_id} />
            <input type="hidden" name="redirect_uri" value={redirect_uri} />
            <input type="hidden" name="scope" value={scope} />
            {state && <input type="hidden" name="state" value={state} />}
            {code_challenge && <input type="hidden" name="code_challenge" value={code_challenge} />}
            {code_challenge_method && <input type="hidden" name="code_challenge_method" value={code_challenge_method} />}
            <input type="hidden" name="tenant_id" value={tenant_id} />

            <Button 
              type="submit" 
              name="action" 
              value="approve" 
              className="w-full"
              size="lg"
            >
              Authorize Application
            </Button>

            <Button 
              type="submit" 
              name="action" 
              value="deny" 
              variant="outline"
              className="w-full"
              size="lg"
            >
              Cancel
            </Button>
          </form>

          {/* Security Notice */}
          <p className="text-center text-xs text-gray-500">
            By authorizing, you allow this application to access your information according to their privacy policy.
            You can revoke access anytime from your account settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
