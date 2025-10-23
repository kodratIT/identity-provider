-- ============================================================================
-- SSO Session Management Schema
-- Purpose: Track central SSO sessions and connected applications
-- ============================================================================

-- Central SSO session (across all apps)
CREATE TABLE sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  device_name TEXT, -- Browser name or device name
  remember_me BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Connected applications in this session
CREATE TABLE sso_connected_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sso_session_id UUID REFERENCES sso_sessions(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  app_session_token TEXT, -- Token used by the app to track its session
  logout_url TEXT, -- Callback URL for single logout
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

-- Session activity log (for security monitoring)
CREATE TABLE sso_session_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sso_session_id UUID REFERENCES sso_sessions(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'logout', 'app_connect', 'app_disconnect', 'token_refresh'
  client_id TEXT REFERENCES oauth_clients(client_id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX idx_sso_sessions_user ON sso_sessions(user_id);
CREATE INDEX idx_sso_sessions_tenant ON sso_sessions(tenant_id);
CREATE INDEX idx_sso_sessions_token ON sso_sessions(session_token);
CREATE INDEX idx_sso_sessions_expires ON sso_sessions(expires_at);
CREATE INDEX idx_sso_sessions_last_activity ON sso_sessions(last_activity_at);

CREATE INDEX idx_sso_connected_apps_session ON sso_connected_apps(sso_session_id);
CREATE INDEX idx_sso_connected_apps_client ON sso_connected_apps(client_id);
CREATE INDEX idx_sso_connected_apps_last_seen ON sso_connected_apps(last_seen_at);

CREATE INDEX idx_sso_activity_session ON sso_session_activity(sso_session_id);
CREATE INDEX idx_sso_activity_type ON sso_session_activity(activity_type);
CREATE INDEX idx_sso_activity_created ON sso_session_activity(created_at DESC);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update last activity time
CREATE OR REPLACE FUNCTION update_sso_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sso_sessions
  SET last_activity_at = now()
  WHERE id = NEW.sso_session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last activity
CREATE TRIGGER trigger_update_sso_activity
  AFTER INSERT ON sso_session_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_sso_session_activity();

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sso_sessions()
RETURNS void AS $$
BEGIN
  -- Delete expired sessions
  DELETE FROM sso_sessions
  WHERE expires_at < now();

  -- Delete inactive sessions (no activity for 30 days)
  DELETE FROM sso_sessions
  WHERE last_activity_at < now() - INTERVAL '30 days'
  AND remember_me = false;

  RAISE NOTICE 'SSO session cleanup completed at %', now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_expired_sso_sessions() TO service_role;

-- Function to get active session count per user
CREATE OR REPLACE FUNCTION get_user_active_sessions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  session_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO session_count
  FROM sso_sessions
  WHERE user_id = p_user_id
  AND expires_at > now();
  
  RETURN session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke all user sessions (forced logout)
CREATE OR REPLACE FUNCTION revoke_all_user_sessions(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Mark all sessions as expired
  UPDATE sso_sessions
  SET expires_at = now()
  WHERE user_id = p_user_id
  AND expires_at > now();

  -- Log the activity
  INSERT INTO sso_session_activity (sso_session_id, activity_type, metadata)
  SELECT id, 'forced_logout', '{"reason": "all_sessions_revoked"}'::jsonb
  FROM sso_sessions
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get connected apps for a session
CREATE OR REPLACE FUNCTION get_session_connected_apps(p_session_id UUID)
RETURNS TABLE (
  app_name TEXT,
  app_logo TEXT,
  connected_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oc.name,
    oc.logo_url,
    sca.connected_at,
    sca.last_seen_at
  FROM sso_connected_apps sca
  JOIN oauth_clients oc ON sca.client_id = oc.client_id
  WHERE sca.sso_session_id = p_session_id
  ORDER BY sca.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Views for Monitoring
-- ============================================================================

-- View for active sessions summary
CREATE OR REPLACE VIEW sso_active_sessions_summary AS
SELECT 
  ss.user_id,
  p.full_name,
  COUNT(DISTINCT ss.id) as active_sessions,
  COUNT(DISTINCT sca.client_id) as connected_apps,
  MAX(ss.last_activity_at) as last_activity,
  t.name as tenant_name
FROM sso_sessions ss
LEFT JOIN profiles p ON ss.user_id = p.id
LEFT JOIN tenants t ON ss.tenant_id = t.id
LEFT JOIN sso_connected_apps sca ON ss.id = sca.sso_session_id
WHERE ss.expires_at > now()
GROUP BY ss.user_id, p.full_name, t.name;

-- Grant select to authenticated users
GRANT SELECT ON sso_active_sessions_summary TO authenticated;

-- View for session statistics
CREATE OR REPLACE VIEW sso_session_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as sessions_created,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN remember_me THEN 1 END) as remember_me_sessions,
  AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_session_duration_seconds
FROM sso_sessions
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant select to authenticated users
GRANT SELECT ON sso_session_stats TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE sso_sessions IS 'Central SSO sessions that span across all applications';
COMMENT ON TABLE sso_connected_apps IS 'Track which applications are connected to each SSO session';
COMMENT ON TABLE sso_session_activity IS 'Activity log for SSO sessions (login, logout, app connections)';

COMMENT ON COLUMN sso_sessions.session_token IS 'Unique token identifying this SSO session';
COMMENT ON COLUMN sso_sessions.remember_me IS 'If true, session has extended expiration';
COMMENT ON COLUMN sso_sessions.device_type IS 'Type of device: desktop, mobile, or tablet';
COMMENT ON COLUMN sso_sessions.device_name IS 'Browser or device name';

COMMENT ON COLUMN sso_connected_apps.logout_url IS 'Callback URL to notify app of single logout';
COMMENT ON COLUMN sso_connected_apps.app_session_token IS 'Token the app uses to track its session';
