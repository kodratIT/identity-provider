-- Row Level Security Policies for OAuth Tables

-- Enable RLS on OAuth tables
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_user_consents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OAuth Clients Policies
-- ============================================================================

-- Super admins can view all OAuth clients
CREATE POLICY "Super admins can view all OAuth clients"
  ON oauth_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND r.name = 'super_admin'
      AND ut.is_active = true
    )
  );

-- Tenant admins can view OAuth clients
CREATE POLICY "Admins can view OAuth clients"
  ON oauth_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- Super admins can manage OAuth clients
CREATE POLICY "Super admins can manage OAuth clients"
  ON oauth_clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND r.name = 'super_admin'
      AND ut.is_active = true
    )
  );

-- Service role bypass (for API operations)
CREATE POLICY "Service role full access to oauth_clients"
  ON oauth_clients FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- OAuth Authorization Codes Policies
-- ============================================================================

-- Users can view their own authorization codes
CREATE POLICY "Users can view their authorization codes"
  ON oauth_authorization_codes FOR SELECT
  USING (user_id = auth.uid());

-- Service role full access (needed for OAuth flow)
CREATE POLICY "Service role full access to authorization codes"
  ON oauth_authorization_codes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Admins can view authorization codes in their tenant
CREATE POLICY "Admins can view tenant authorization codes"
  ON oauth_authorization_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = oauth_authorization_codes.tenant_id
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- ============================================================================
-- OAuth Access Tokens Policies
-- ============================================================================

-- Users can view their own access tokens
CREATE POLICY "Users can view their access tokens"
  ON oauth_access_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Service role full access (needed for OAuth flow)
CREATE POLICY "Service role full access to access tokens"
  ON oauth_access_tokens FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Users can revoke their own tokens
CREATE POLICY "Users can revoke their access tokens"
  ON oauth_access_tokens FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view access tokens in their tenant
CREATE POLICY "Admins can view tenant access tokens"
  ON oauth_access_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = oauth_access_tokens.tenant_id
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- ============================================================================
-- OAuth Refresh Tokens Policies
-- ============================================================================

-- Service role full access (needed for OAuth flow)
CREATE POLICY "Service role full access to refresh tokens"
  ON oauth_refresh_tokens FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Users can view their own refresh tokens (via access_token_id)
CREATE POLICY "Users can view their refresh tokens"
  ON oauth_refresh_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM oauth_access_tokens
      WHERE oauth_access_tokens.id = oauth_refresh_tokens.access_token_id
      AND oauth_access_tokens.user_id = auth.uid()
    )
  );

-- Admins can view refresh tokens in their tenant
CREATE POLICY "Admins can view tenant refresh tokens"
  ON oauth_refresh_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM oauth_access_tokens oat
      JOIN user_tenants ut ON oat.tenant_id = ut.tenant_id
      JOIN roles r ON ut.role_id = r.id
      WHERE oat.id = oauth_refresh_tokens.access_token_id
      AND ut.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- ============================================================================
-- OAuth User Consents Policies
-- ============================================================================

-- Users can view their own consents
CREATE POLICY "Users can view their consents"
  ON oauth_user_consents FOR SELECT
  USING (user_id = auth.uid());

-- Users can revoke their own consents
CREATE POLICY "Users can revoke their consents"
  ON oauth_user_consents FOR DELETE
  USING (user_id = auth.uid());

-- Service role full access (needed for OAuth flow)
CREATE POLICY "Service role full access to user consents"
  ON oauth_user_consents FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Admins can view consents in their tenant
CREATE POLICY "Admins can view tenant consents"
  ON oauth_user_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = oauth_user_consents.tenant_id
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- ============================================================================
-- Indexes for Performance (already created in migration, but documenting here)
-- ============================================================================

-- Already created:
-- CREATE INDEX idx_oauth_codes_user ON oauth_authorization_codes(user_id);
-- CREATE INDEX idx_oauth_codes_client ON oauth_authorization_codes(client_id);
-- CREATE INDEX idx_oauth_tokens_user ON oauth_access_tokens(user_id);
-- CREATE INDEX idx_oauth_tokens_client ON oauth_access_tokens(client_id);
-- CREATE INDEX idx_oauth_tokens_expires ON oauth_access_tokens(expires_at);

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_oauth_clients_active ON oauth_clients(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_expires ON oauth_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_access_token ON oauth_refresh_tokens(access_token_id);
CREATE INDEX IF NOT EXISTS idx_oauth_user_consents_user_client ON oauth_user_consents(user_id, client_id);

-- ============================================================================
-- Cleanup Functions (Run periodically via cron or manually)
-- ============================================================================

-- Function to cleanup expired tokens and codes
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_data()
RETURNS void AS $$
BEGIN
  -- Delete expired authorization codes
  DELETE FROM oauth_authorization_codes
  WHERE expires_at < now();

  -- Delete expired access tokens
  DELETE FROM oauth_access_tokens
  WHERE expires_at < now() AND revoked_at IS NOT NULL;

  -- Delete expired refresh tokens
  DELETE FROM oauth_refresh_tokens
  WHERE expires_at < now();

  -- Log cleanup
  RAISE NOTICE 'OAuth cleanup completed at %', now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_oauth_data() TO service_role;

-- ============================================================================
-- OAuth Statistics Views (for admin dashboard)
-- ============================================================================

-- View for OAuth client statistics
CREATE OR REPLACE VIEW oauth_client_stats AS
SELECT 
  oc.id,
  oc.client_id,
  oc.name,
  oc.is_active,
  oc.is_first_party,
  COUNT(DISTINCT oat.user_id) as active_users,
  COUNT(oat.id) as total_tokens_issued,
  MAX(oat.created_at) as last_token_issued
FROM oauth_clients oc
LEFT JOIN oauth_access_tokens oat ON oc.client_id = oat.client_id
GROUP BY oc.id, oc.client_id, oc.name, oc.is_active, oc.is_first_party;

-- Grant select to authenticated users (they'll still be filtered by RLS)
GRANT SELECT ON oauth_client_stats TO authenticated;

COMMENT ON TABLE oauth_clients IS 'OAuth 2.0 client applications registered in the system';
COMMENT ON TABLE oauth_authorization_codes IS 'Temporary authorization codes for OAuth code flow';
COMMENT ON TABLE oauth_access_tokens IS 'Active OAuth access tokens';
COMMENT ON TABLE oauth_refresh_tokens IS 'OAuth refresh tokens for obtaining new access tokens';
COMMENT ON TABLE oauth_user_consents IS 'User consent records for OAuth applications';
