-- Identity Provider Multi-Tenant Database Schema
-- Fixed version with no ambiguous column references

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Tenants (Schools) Table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  subscription_tier TEXT DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Roles Table (Per Tenant)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Permissions Table (System-wide)
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- User Tenants (User-Tenant-Role Association)
CREATE TABLE IF NOT EXISTS user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- User Profiles (Extended User Information)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs (Track Important Actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_role_id ON user_tenants(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts on re-run)
DROP POLICY IF EXISTS "Users can view their tenants" ON tenants;
DROP POLICY IF EXISTS "Admins can manage their tenant" ON tenants;
DROP POLICY IF EXISTS "Users can view their tenant associations" ON user_tenants;
DROP POLICY IF EXISTS "Admins can manage tenant users" ON user_tenants;
DROP POLICY IF EXISTS "Users can view roles in their tenants" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles in their tenant" ON roles;
DROP POLICY IF EXISTS "Everyone can view permissions" ON permissions;
DROP POLICY IF EXISTS "Users can view role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view tenant audit logs" ON audit_logs;

-- Tenants Policies
CREATE POLICY "Users can view their tenants"
  ON tenants FOR SELECT
  USING (
    id IN (
      SELECT ut.tenant_id FROM user_tenants ut
      WHERE ut.user_id = auth.uid() AND ut.is_active = true
    )
  );

CREATE POLICY "Admins can manage their tenant"
  ON tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = tenants.id
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- User Tenants Policies
CREATE POLICY "Users can view their tenant associations"
  ON user_tenants FOR SELECT
  USING (
    user_id = auth.uid() OR
    tenant_id IN (
      SELECT ut2.tenant_id FROM user_tenants ut2
      JOIN roles r ON ut2.role_id = r.id
      WHERE ut2.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
      AND ut2.is_active = true
    )
  );

CREATE POLICY "Admins can manage tenant users"
  ON user_tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = user_tenants.tenant_id
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- Roles Policies
CREATE POLICY "Users can view roles in their tenants"
  ON roles FOR SELECT
  USING (
    tenant_id IN (
      SELECT ut.tenant_id FROM user_tenants ut
      WHERE ut.user_id = auth.uid() AND ut.is_active = true
    )
  );

CREATE POLICY "Admins can manage roles in their tenant"
  ON roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r2 ON ut.role_id = r2.id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = roles.tenant_id
      AND r2.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- Permissions Policies (Read-only for all authenticated users)
CREATE POLICY "Everyone can view permissions"
  ON permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Role Permissions Policies
CREATE POLICY "Users can view role permissions"
  ON role_permissions FOR SELECT
  USING (
    role_id IN (
      SELECT r.id FROM roles r
      JOIN user_tenants ut ON ut.tenant_id = r.tenant_id
      WHERE ut.user_id = auth.uid() AND ut.is_active = true
    )
  );

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Audit Logs Policies
CREATE POLICY "Admins can view tenant audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      JOIN roles r ON ut.role_id = r.id
      WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = audit_logs.tenant_id
      AND r.name IN ('super_admin', 'admin')
      AND ut.is_active = true
    )
  );

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Function to create default roles for a new tenant
CREATE OR REPLACE FUNCTION create_default_roles(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO roles (tenant_id, name, display_name, description, is_system, priority) VALUES
    (tenant_uuid, 'super_admin', 'Super Admin', 'Full system access', true, 100),
    (tenant_uuid, 'admin', 'Administrator', 'School administrator', true, 90),
    (tenant_uuid, 'teacher', 'Teacher', 'Teaching staff', true, 50),
    (tenant_uuid, 'student', 'Student', 'Student user', true, 10),
    (tenant_uuid, 'parent', 'Parent', 'Parent/Guardian', true, 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, created_at)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_on_signup();

-- Function to check user permission
CREATE OR REPLACE FUNCTION has_permission(
  user_uuid UUID,
  tenant_uuid UUID,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_tenants ut
    JOIN role_permissions rp ON ut.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ut.user_id = user_uuid
    AND ut.tenant_id = tenant_uuid
    AND ut.is_active = true
    AND p.name = permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. SEED DATA - Default Permissions
-- ============================================

INSERT INTO permissions (name, resource, action, description) VALUES
  -- User permissions
  ('users.create', 'users', 'create', 'Create new users'),
  ('users.read', 'users', 'read', 'View user information'),
  ('users.update', 'users', 'update', 'Update user information'),
  ('users.delete', 'users', 'delete', 'Delete users'),
  ('users.invite', 'users', 'invite', 'Invite new users'),
  
  -- Role permissions
  ('roles.create', 'roles', 'create', 'Create new roles'),
  ('roles.read', 'roles', 'read', 'View roles'),
  ('roles.update', 'roles', 'update', 'Update roles'),
  ('roles.delete', 'roles', 'delete', 'Delete roles'),
  ('roles.assign', 'roles', 'assign', 'Assign roles to users'),
  
  -- Tenant permissions
  ('tenants.read', 'tenants', 'read', 'View tenant information'),
  ('tenants.update', 'tenants', 'update', 'Update tenant settings'),
  ('tenants.delete', 'tenants', 'delete', 'Delete tenant'),
  
  -- Audit permissions
  ('audit.read', 'audit', 'read', 'View audit logs')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. CREATE TEST TENANT (Optional)
-- ============================================

-- Uncomment to create a test tenant
/*
DO $$
DECLARE
  test_tenant_id UUID;
BEGIN
  -- Insert test tenant
  INSERT INTO tenants (name, slug, domain, is_active)
  VALUES ('Test School', 'test-school', 'test.school.com', true)
  RETURNING id INTO test_tenant_id;
  
  -- Create default roles for test tenant
  PERFORM create_default_roles(test_tenant_id);
  
  RAISE NOTICE 'Test tenant created with ID: %', test_tenant_id;
END $$;
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify setup
/*
SELECT 'Tenants' as table_name, COUNT(*) as count FROM tenants
UNION ALL
SELECT 'Roles', COUNT(*) FROM roles
UNION ALL
SELECT 'Permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'User Tenants', COUNT(*) FROM user_tenants
UNION ALL
SELECT 'Profiles', COUNT(*) FROM profiles;
*/

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '📊 Tables created: 7';
  RAISE NOTICE '🔒 RLS policies enabled: 7 tables';
  RAISE NOTICE '⚙️  Functions created: 3';
  RAISE NOTICE '📝 Permissions seeded: 14';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '1. Verify tables in Table Editor';
  RAISE NOTICE '2. Test user registration';
  RAISE NOTICE '3. Create your first tenant';
END $$;
