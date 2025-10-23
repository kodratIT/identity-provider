-- ============================================================================
-- Row Level Security Policies for SSO Session Tables
-- ============================================================================

-- Enable RLS on all SSO tables
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_connected_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_session_activity ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SSO Sessions Policies
-- ============================================================================

-- Users can view their own sessions
CREATE POLICY "Users can view their own SSO sessions"
  ON sso_sessions FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own sessions (for activity tracking)
CREATE POLICY "Users can update their own SSO sessions"
  ON sso_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own sessions (logout)
CREATE POLICY "Users can revoke their own SSO sessions"
  ON sso_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role full access (needed for SSO operations)
CREATE POLICY "Service role full access to SSO sessions"
  ON sso_sessions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Admins can view sessions in their tenant
CREATE POLICY "Admins can view tenant SSO sessions"
  ON sso_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = sso_sessions.tenant_id
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- Admins can revoke sessions in their tenant
CREATE POLICY "Admins can revoke tenant SSO sessions"
  ON sso_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = sso_sessions.tenant_id
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- ============================================================================
-- SSO Connected Apps Policies
-- ============================================================================

-- Users can view connected apps for their own sessions
CREATE POLICY "Users can view their connected apps"
  ON sso_connected_apps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sso_sessions
      WHERE sso_sessions.id = sso_connected_apps.sso_session_id
      AND sso_sessions.user_id = auth.uid()
    )
  );

-- Users can disconnect apps from their sessions
CREATE POLICY "Users can disconnect their apps"
  ON sso_connected_apps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sso_sessions
      WHERE sso_sessions.id = sso_connected_apps.sso_session_id
      AND sso_sessions.user_id = auth.uid()
    )
  );

-- Service role full access (needed for OAuth flow)
CREATE POLICY "Service role full access to connected apps"
  ON sso_connected_apps FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Admins can view connected apps in their tenant
CREATE POLICY "Admins can view tenant connected apps"
  ON sso_connected_apps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sso_sessions ss
      JOIN user_tenants ut ON ss.tenant_id = ut.tenant_id
      JOIN roles r ON ut.role_id = r.id
      WHERE ss.id = sso_connected_apps.sso_session_id
      AND ut.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- ============================================================================
-- SSO Session Activity Policies
-- ============================================================================

-- Users can view activity for their own sessions
CREATE POLICY "Users can view their session activity"
  ON sso_session_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sso_sessions
      WHERE sso_sessions.id = sso_session_activity.sso_session_id
      AND sso_sessions.user_id = auth.uid()
    )
  );

-- Service role full access (needed for logging)
CREATE POLICY "Service role full access to session activity"
  ON sso_session_activity FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Admins can view activity in their tenant
CREATE POLICY "Admins can view tenant session activity"
  ON sso_session_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sso_sessions ss
      JOIN user_tenants ut ON ss.tenant_id = ut.tenant_id
      JOIN roles r ON ut.role_id = r.id
      WHERE ss.id = sso_session_activity.sso_session_id
      AND ut.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- ============================================================================
-- Security Notes
-- ============================================================================

-- All SSO session operations should go through service role for:
-- 1. Creating sessions (login)
-- 2. Connecting apps (OAuth flow)
-- 3. Logging activity
-- 4. Cleanup operations

-- Users can only view and revoke their own sessions directly
-- Admins can view and manage sessions in their tenant

COMMENT ON POLICY "Users can view their own SSO sessions" ON sso_sessions IS 
  'Allow users to see their active sessions for security monitoring';

COMMENT ON POLICY "Admins can view tenant SSO sessions" ON sso_sessions IS 
  'Allow tenant admins to monitor active sessions in their school';

COMMENT ON POLICY "Service role full access to SSO sessions" ON sso_sessions IS 
  'Service role bypass for SSO operations (login, logout, token issuance)';
