# 🗄️ Database Setup Guide - Fixed Version

## ✅ Fixed SQL Schema

Saya sudah memperbaiki SQL schema yang menyebabkan error "column reference 'tenant_id' is ambiguous".

**File**: `database-schema.sql` (di root project ini)

---

## 🚀 Quick Setup

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**

### Step 2: Copy & Execute SQL

#### Option A: From File (Recommended)

```bash
# From your terminal, copy the SQL file content
cat database-schema.sql

# Then paste into Supabase SQL Editor
```

#### Option B: Direct Copy

1. Open `database-schema.sql` in this directory
2. **Select All** (Cmd+A / Ctrl+A)
3. **Copy** (Cmd+C / Ctrl+C)
4. **Paste** into Supabase SQL Editor
5. Click **Run** (or press Cmd+Enter / Ctrl+Enter)

### Step 3: Verify Success

You should see success messages in the output panel:

```
✅ Database schema created successfully!
📊 Tables created: 7
🔒 RLS policies enabled: 7 tables
⚙️ Functions created: 3
📝 Permissions seeded: 14
```

### Step 4: Verify Tables

1. Go to **Table Editor** (left sidebar)
2. You should see 7 tables:
   - ✅ tenants
   - ✅ roles
   - ✅ permissions
   - ✅ role_permissions
   - ✅ user_tenants
   - ✅ profiles
   - ✅ audit_logs

---

## 🔧 What Was Fixed

### Problem
The original SQL had ambiguous column references in RLS policies:
```sql
-- ❌ WRONG - ambiguous tenant_id
WHERE tenant_id = auth.uid()
```

### Solution
Added table aliases and fully qualified column names:
```sql
-- ✅ CORRECT - fully qualified
WHERE ut.tenant_id = tenants.id
```

### Changes Made

1. **All RLS Policies**:
   - Added table aliases (ut, r, ut2, r2)
   - Fully qualified all column references
   - No more ambiguous columns

2. **Added Safety**:
   - `DROP POLICY IF EXISTS` before creating policies
   - `ON CONFLICT DO NOTHING` for seed data
   - `CREATE TABLE IF NOT EXISTS` for tables

3. **Better Verification**:
   - Success messages at the end
   - Optional verification queries
   - Clear next steps

---

## 📊 Database Schema Overview

### Tables Created

#### 1. tenants (Schools)
```sql
- id (UUID, primary key)
- name (school name)
- slug (unique identifier)
- domain (optional domain)
- settings (JSONB for configuration)
- is_active (boolean)
```

#### 2. roles (Per Tenant)
```sql
- id (UUID, primary key)
- tenant_id (reference to tenants)
- name (role identifier)
- display_name (human-readable)
- is_system (system role flag)
- priority (role hierarchy)
```

#### 3. permissions (System-wide)
```sql
- id (UUID, primary key)
- name (permission identifier)
- resource (resource type)
- action (action type)
- description
```

#### 4. role_permissions (Junction)
```sql
- role_id (reference to roles)
- permission_id (reference to permissions)
```

#### 5. user_tenants (User-Tenant-Role)
```sql
- user_id (reference to auth.users)
- tenant_id (reference to tenants)
- role_id (reference to roles)
- is_active (boolean)
```

#### 6. profiles (User Profiles)
```sql
- id (reference to auth.users)
- full_name
- avatar_url
- phone, bio, timezone, locale
```

#### 7. audit_logs (Activity Tracking)
```sql
- user_id (who did it)
- tenant_id (in which tenant)
- action (what happened)
- resource (what was affected)
- metadata (additional data)
```

---

## 🔒 Row Level Security (RLS)

All tables have RLS enabled with these policies:

### Tenant Isolation
- Users can only see data from their tenants
- Admins can manage their own tenant
- Automatic filtering by tenant_id

### User Data
- Users can view their own profile
- Users can view their tenant associations
- Admins can manage users in their tenant

### Permissions
- Everyone can view available permissions
- Users can view role permissions for their tenants

### Audit Logs
- Admins can view audit logs for their tenant
- Regular users cannot access audit logs

---

## 🧪 Testing the Database

### 1. Verify Tables
```sql
-- Run in SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'roles', 'permissions', 'role_permissions', 'user_tenants', 'profiles', 'audit_logs');
```

Should return 7 rows.

### 2. Check RLS Policies
```sql
-- Run in SQL Editor
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

Should show multiple policies per table.

### 3. Verify Permissions
```sql
-- Run in SQL Editor
SELECT COUNT(*) as total_permissions FROM permissions;
```

Should return 14.

### 4. Test Functions
```sql
-- Run in SQL Editor
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('create_default_roles', 'create_profile_on_signup', 'has_permission');
```

Should return 3 functions.

---

## 🎯 Create Your First Tenant

After the schema is created, create a test tenant:

```sql
-- Run in SQL Editor
DO $$
DECLARE
  test_tenant_id UUID;
  admin_role_id UUID;
BEGIN
  -- Create tenant
  INSERT INTO tenants (name, slug, domain, is_active)
  VALUES ('My School', 'my-school', 'myschool.com', true)
  RETURNING id INTO test_tenant_id;
  
  -- Create default roles
  PERFORM create_default_roles(test_tenant_id);
  
  -- Get admin role
  SELECT id INTO admin_role_id
  FROM roles
  WHERE tenant_id = test_tenant_id
  AND name = 'admin';
  
  RAISE NOTICE 'Tenant created with ID: %', test_tenant_id;
  RAISE NOTICE 'Admin role ID: %', admin_role_id;
  RAISE NOTICE 'You can now assign users to this tenant!';
END $$;
```

---

## 🔗 Link User to Tenant

After user registers, link them to a tenant:

```sql
-- Replace these with actual IDs
DO $$
DECLARE
  my_user_id UUID := 'user-uuid-here'; -- From auth.users
  my_tenant_id UUID := 'tenant-uuid-here'; -- From tenants table
  my_role_id UUID; -- Will be fetched
BEGIN
  -- Get admin role for the tenant
  SELECT id INTO my_role_id
  FROM roles
  WHERE tenant_id = my_tenant_id
  AND name = 'admin';
  
  -- Link user to tenant with admin role
  INSERT INTO user_tenants (user_id, tenant_id, role_id, is_active)
  VALUES (my_user_id, my_tenant_id, my_role_id, true);
  
  RAISE NOTICE 'User linked to tenant successfully!';
END $$;
```

---

## 🐛 Troubleshooting

### Error: "column reference is ambiguous"
✅ **Fixed!** Use the new `database-schema.sql` file.

### Error: "relation already exists"
**Solution**: The new SQL handles this with `IF NOT EXISTS` and `DROP POLICY IF EXISTS`.

### Error: "permission denied"
**Solution**: Make sure you're using the service_role key, not anon key for SQL execution.

### Tables don't appear
**Solution**:
1. Check for error messages in SQL Editor output
2. Verify you're connected to the right project
3. Refresh the Table Editor page

### RLS policies blocking access
**Solution**:
1. Verify user is authenticated
2. Check user has tenant association in user_tenants table
3. Use service_role key for testing (bypasses RLS)

---

## 📝 Next Steps After Database Setup

1. ✅ Database schema created
2. ⏳ Register a new user (via your app)
3. ⏳ Create a tenant (via SQL or app)
4. ⏳ Link user to tenant (via SQL or app)
5. ⏳ Test login and dashboard
6. ⏳ Verify tenant isolation

---

## 🎉 Success Checklist

- [ ] SQL executed without errors
- [ ] All 7 tables visible in Table Editor
- [ ] RLS policies showing in Table Editor
- [ ] 14 permissions in permissions table
- [ ] 3 functions created
- [ ] Test tenant created (optional)
- [ ] User can register via app
- [ ] User can login via app
- [ ] Dashboard accessible after login

---

## 💡 Pro Tips

1. **Use SQL Editor Output**: Always check the output panel for errors
2. **Test Incrementally**: Run sections of SQL one at a time if you get errors
3. **Use Table Editor**: Visual way to verify data
4. **Check RLS**: Go to Table Editor > Click table > RLS tab
5. **Monitor Logs**: Supabase Dashboard > Logs to see real-time activity

---

**Status**: SQL Schema Fixed ✅  
**File**: `database-schema.sql`  
**Ready**: Copy and execute in Supabase! 🚀

---

Need help? Check the troubleshooting section above or the error messages in Supabase SQL Editor output panel.
