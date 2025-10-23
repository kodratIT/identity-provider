import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserActiveSessions } from '@/lib/sso/adapter'
import { formatLastActivity, formatSessionDuration } from '@/lib/sso/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Monitor, Smartphone, Tablet, HelpCircle, Shield, LogOut } from 'lucide-react'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all active sessions
  const sessions = await getUserActiveSessions(user.id)

  // Get current session token
  const cookieStore = await (await import('next/headers')).cookies()
  const currentSessionToken = (await cookieStore).get('sso_session_token')?.value

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Active Sessions</h1>
        <p className="text-muted-foreground mt-2">
          Manage your active sessions across all devices
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devices</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(sessions.map(s => s.device_type)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique device types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.length > 0 ? formatLastActivity(sessions[0].last_activity_at) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Most recent session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Active Sessions</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any active sessions
              </p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => {
            const isCurrentSession = session.session_token === currentSessionToken
            const sessionDuration = Math.floor(
              (new Date(session.expires_at).getTime() - Date.now()) / 1000
            )

            return (
              <Card key={session.id}>
                <CardContent className="flex items-start justify-between p-6">
                  <div className="flex gap-4">
                    {/* Device Icon */}
                    <div className="rounded-full bg-blue-100 p-3">
                      {session.device_type === 'desktop' && (
                        <Monitor className="h-6 w-6 text-blue-600" />
                      )}
                      {session.device_type === 'mobile' && (
                        <Smartphone className="h-6 w-6 text-blue-600" />
                      )}
                      {session.device_type === 'tablet' && (
                        <Tablet className="h-6 w-6 text-blue-600" />
                      )}
                      {session.device_type === 'unknown' && (
                        <HelpCircle className="h-6 w-6 text-blue-600" />
                      )}
                    </div>

                    {/* Session Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {session.device_name || 'Unknown Device'}
                        </h3>
                        {isCurrentSession && (
                          <Badge variant="default" className="bg-green-600">
                            Current Session
                          </Badge>
                        )}
                        {session.remember_me && (
                          <Badge variant="secondary">Remember Me</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium">IP Address:</span> {session.ip_address || 'Unknown'}
                        </p>
                        <p>
                          <span className="font-medium">Last Activity:</span>{' '}
                          {formatLastActivity(session.last_activity_at)}
                        </p>
                        <p>
                          <span className="font-medium">Created:</span>{' '}
                          {new Date(session.created_at).toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Expires:</span>{' '}
                          {formatSessionDuration(sessionDuration)} remaining
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {!isCurrentSession && (
                      <form action={`/api/sessions/${session.id}/revoke`} method="POST">
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Revoke All Sessions */}
      {sessions.length > 1 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Revoke all other sessions except your current one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/sessions/revoke-all" method="POST">
              <Button type="submit" variant="destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout All Other Sessions
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
