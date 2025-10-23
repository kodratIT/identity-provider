# Business Process Guide - Identity Provider

**Complete guide for understanding and operating the Identity Provider system**

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Hierarchy & Roles](#hierarchy--roles)
3. [Initial Setup Process](#initial-setup-process)
4. [Super Admin Setup Checklist](#super-admin-setup-checklist)
5. [Daily Operations](#daily-operations)
6. [SSO Login Flow](#sso-login-flow)
7. [Single Logout Flow](#single-logout-flow)
8. [Data Creation Order](#data-creation-order)

---

## 🎯 System Overview

This Identity Provider is a **Federated Identity Management System** designed for educational institutions (schools) with the following capabilities:

- **Multi-tenant architecture**: Multiple schools in one system
- **OAuth 2.0 Provider**: Enable Single Sign-On (SSO) for external applications
- **RBAC**: Role-Based Access Control with fine-grained permissions
- **SSO Session Management**: Track sessions across all applications
- **Super Admin Dashboard**: Global oversight and management

### Key Entities

```
Super Admin (Platform Owner)
├── Tenants (Schools)
│   ├── Users (Teachers, Students, Parents)
│   └── Roles (Admin, Teacher, Student, Parent)
└── OAuth Clients (Applications)
    ├── LMS (Learning Management System)
    ├── Grading System
    ├── Attendance System
    ├── Library System
    └── Finance System
```

---

## 🏢 Hierarchy & Roles

### Role Hierarchy

```
┌─────────────────────────────────────────────────────┐
│  Super Admin (Platform Owner)                       │
│    └── Tenant 1 (School A)                          │
│        ├── Admin                                     │
│        ├── Teacher                                   │
│        ├── Student                                   │
│        └── Parent                                    │
│    └── Tenant 2 (School B)                          │
│        ├── Admin                                     │
│        ├── Teacher                                   │
│        └── Student                                   │
│    └── OAuth Clients (Applications)                 │
│        ├── LMS                                       │
│        ├── Grading System                           │
│        └── Library System                           │
└─────────────────────────────────────────────────────┘
```

### Default Roles per Tenant

| Role | Permissions | Description |
|------|------------|-------------|
| **super_admin** | ALL | Global system access, manage all tenants |
| **admin** | users.*, roles.*, tenants.read | School administrator, manage school operations |
| **teacher** | users.read, grades.*, attendance.* | Teaching staff, manage classes and grades |
| **student** | users.read, grades.read | Student access to their own data |
| **parent** | users.read, grades.read | Parent access to children's data |

---

## 🚀 Initial Setup Process

### Phase 1: Database Setup (One-time)

```bash
# 1. Apply database schemas
psql $DATABASE_URL -f database-schema.sql
psql $DATABASE_URL -f database-oauth-schema.sql
psql $DATABASE_URL -f sso-session-schema.sql

# 2. Apply RLS policies
psql $DATABASE_URL -f oauth-rls-policies.sql
psql $DATABASE_URL -f sso-session-rls-policies.sql
```

### Phase 2: Create First Tenant & Super Admin

**Urutan yang BENAR:**

1. Register first user via `/register`
2. Create first tenant (via SQL)
3. Assign super_admin role to first user

**SQL Script:**

```sql
-- 1. Create first tenant (School)
INSERT INTO tenants (name, slug, is_active)
VALUES ('Main School', 'main-school', true)
RETURNING id;

-- Copy the returned tenant_id

-- 2. Get the user_id from profiles (after registration)
SELECT id FROM profiles WHERE email = 'superadmin@school.com';

-- Copy the returned user_id

-- 3. Create default roles for the tenant
SELECT create_default_roles('<tenant-id-from-step-1>');

-- 4. Assign super_admin role
INSERT INTO user_tenants (user_id, tenant_id, role_id, is_active)
SELECT 
  '<user-id-from-step-2>',
  '<tenant-id-from-step-1>',
  (SELECT id FROM roles WHERE name = 'super_admin' AND tenant_id = '<tenant-id-from-step-1>'),
  true;
```

### Phase 3: Environment Configuration

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Generate secure JWT secret (48 chars recommended)
JWT_SECRET=$(openssl rand -base64 48)
```

---

## 📝 Super Admin Setup Checklist

### Complete First-Time Setup (Step-by-Step)

```
┌─────────────────────────────────────────────────────────┐
│  SUPER ADMIN FIRST-TIME SETUP CHECKLIST                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ☐ STEP 1: TENANTS                                      │
│      Location: /tenants                                  │
│      Action: Verify/Create first tenant                 │
│      Duration: 2 minutes                                │
│                                                          │
│  ☐ STEP 2: ROLES & PERMISSIONS                          │
│      Location: /roles                                    │
│      Actions:                                            │
│        ├─ Verify default roles exist                    │
│        ├─ Check permissions assigned                    │
│        └─ Customize if needed                           │
│      Duration: 5 minutes                                │
│                                                          │
│  ☐ STEP 3: INVITE SCHOOL ADMIN                          │
│      Location: /users                                    │
│      Action: Invite 1-2 admin users                     │
│      Duration: 3 minutes                                │
│                                                          │
│  ☐ STEP 4: INVITE USERS                                 │
│      Location: /users                                    │
│      Actions:                                            │
│        ├─ Invite Teachers (5-20)                        │
│        ├─ Invite Students (50-500)                      │
│        └─ Invite Parents (50-500)                       │
│      Duration: 1-2 hours (bulk import recommended)      │
│                                                          │
│  ☐ STEP 5: REGISTER APPLICATIONS                        │
│      Location: /applications                             │
│      Actions:                                            │
│        ├─ Register LMS                                  │
│        ├─ Register Grading System                       │
│        ├─ Register Attendance System                    │
│        ├─ Register Library System                       │
│        └─ Register Finance System                       │
│      ⚠️  IMPORTANT: Save client_secret (shown once!)    │
│      Duration: 30 minutes (5-10 apps)                   │
│                                                          │
│  ☐ STEP 6: TEST OAUTH FLOW                              │
│      Actions:                                            │
│        ├─ Login via external app                        │
│        ├─ Verify tokens issued                          │
│        ├─ Check sessions (/sessions)                    │
│        └─ Verify audit logs (/audit-logs)               │
│      Duration: 15 minutes                               │
│                                                          │
│  ☐ STEP 7: CONFIGURE SETTINGS                           │
│      Location: /settings                                 │
│      Actions:                                            │
│        ├─ Update profile                                │
│        ├─ Setup notifications                           │
│        └─ Configure security settings                   │
│      Duration: 10 minutes                               │
│                                                          │
│  ✅ TOTAL TIME: ~2-3 hours (first setup)                │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Detailed Setup Steps

### STEP 1: Tenants

**Go to:** `/tenants`

**What to do:**
1. Verify if first tenant exists
2. If not, click "Create Tenant"
3. Fill form:
   - **Name**: Main School (or your school name)
   - **Slug**: main-school (URL-friendly)
   - **Domain** (optional): school.edu
   - **Logo** (optional): Upload school logo
4. Click "Create"

**What happens:**
- ✅ Tenant record created
- ✅ Default roles auto-created (super_admin, admin, teacher, student, parent)
- ✅ Default permissions auto-assigned

**Why first:**
- All data is tied to a tenant
- Roles can't exist without a tenant
- Users must belong to a tenant

---

### STEP 2: Roles & Permissions

**Go to:** `/roles`

**What to do:**
1. Verify default roles exist:
   - ✅ super_admin
   - ✅ admin
   - ✅ teacher
   - ✅ student
   - ✅ parent

2. Click each role to verify permissions:
   - **super_admin**: ALL permissions
   - **admin**: users.*, roles.*, tenants.read
   - **teacher**: users.read, grades.*, attendance.*
   - **student**: users.read, grades.read
   - **parent**: users.read, grades.read

3. (Optional) Customize:
   - Add custom roles: "librarian", "counselor", "IT staff"
   - Adjust permissions as needed
   - Click "Create Role" for new roles

**Why after tenants:**
- Roles are tenant-specific
- Each tenant has its own role set
- Permissions must be assigned before inviting users

---

### STEP 3: Invite School Admin

**Go to:** `/users`

**What to do:**
1. Click "Invite User"
2. Fill form:
   - **Email**: admin@school.com
   - **Full Name**: John Admin
   - **Role**: Admin (NOT super_admin)
   - **Tenant**: Main School (auto-selected)
3. Click "Send Invitation"

**What happens:**
- ✅ User receives invitation email
- ✅ User registers and sets password
- ✅ User auto-assigned as admin for the school

**Why separate admin:**
- Super admin: Global/cross-tenant management
- School admin: Day-to-day school operations
- Separation of concerns

---

### STEP 4: Invite Users

**Go to:** `/users`

**Option A: One-by-one (Small scale)**

1. Click "Invite User" for each person
2. Fill form:
   - Email
   - Full Name
   - Role (Teacher/Student/Parent)
3. Send invitation

**Option B: Bulk Import (Recommended for large scale)**

1. Prepare CSV file:
```csv
email,full_name,role
teacher1@school.com,Jane Teacher,teacher
teacher2@school.com,Bob Teacher,teacher
student1@school.com,Alice Student,student
student2@school.com,Charlie Student,student
parent1@school.com,Parent One,parent
```

2. Click "Import Users"
3. Upload CSV
4. Review and confirm
5. System sends invitation emails to all

**Recommended order:**
```
1. Admins (1-2 people)
   ↓
2. Teachers (5-20 people)
   ↓
3. Students (50-500 people)
   ↓
4. Parents (50-500 people)
```

---

### STEP 5: Register Applications

**Go to:** `/applications`

**What to do:**

1. Click "Register Application"

2. **Register LMS:**
   - **Name**: Learning Management System
   - **Description**: Main LMS for courses and assignments
   - **Homepage**: https://lms.school.com
   - **Redirect URIs**:
     ```
     https://lms.school.com/callback
     https://lms.school.com/auth/callback
     ```
   - **Allowed Scopes**:
     - ☑ openid
     - ☑ profile
     - ☑ email
     - ☑ grades:read
     - ☑ grades:write
   - **First-party app**: ☑ Yes
   - Click "Register"

3. **⚠️ IMPORTANT: Save Credentials!**
   ```
   client_id: client_abc123...
   client_secret: secret_xyz789... (SHOWN ONLY ONCE!)
   ```
   Copy and save these credentials immediately!

4. **Repeat for other applications:**
   - Grading System
   - Attendance System
   - Library System
   - Finance System
   - Parent Portal

**What gets created:**
```sql
oauth_clients table entry:
  - client_id (unique identifier)
  - client_secret_hash (secure storage)
  - redirect_uris (callback URLs)
  - allowed_scopes (permissions)
  - allowed_grant_types (OAuth flows)
```

**Why after users:**
- Applications need users to test OAuth flow
- Can verify integration works correctly
- Applications are for external integrations

---

### STEP 6: Test OAuth Flow

**What to do:**

1. **Setup external application** with credentials from Step 5

2. **Test login flow:**
   - Open external app (e.g., LMS)
   - Click "Login with School Account"
   - Redirects to Identity Provider
   - Login with test user credentials
   - Approve consent screen
   - Redirects back to LMS with tokens

3. **Verify in dashboards:**
   - **Applications** (`/applications`):
     - Check statistics: tokens issued, active users
   - **Sessions** (`/sessions`):
     - See active SSO sessions
     - Check device information
     - See connected apps
   - **Audit Logs** (`/audit-logs`):
     - View login events
     - Check OAuth token issuance
     - Monitor user activity

4. **Test token endpoints:**
   ```bash
   # Get user info
   curl -H "Authorization: Bearer ACCESS_TOKEN" \
     https://identity-provider.com/api/oauth/userinfo
   
   # Refresh token
   curl -X POST https://identity-provider.com/api/oauth/token \
     -d "grant_type=refresh_token" \
     -d "refresh_token=REFRESH_TOKEN" \
     -d "client_id=CLIENT_ID" \
     -d "client_secret=CLIENT_SECRET"
   ```

---

### STEP 7: Configure Settings

**Go to:** `/settings`

**What to do:**

1. **Update Profile:**
   - Full name
   - Phone number
   - Bio

2. **Setup Notifications:**
   - Email notifications: Enabled
   - Security alerts: Enabled

3. **Configure Security:**
   - Change password
   - Enable 2FA (if available)
   - Review active sessions

---

## 🔄 Daily Operations

### Super Admin Tasks

**Go to:** `/admin` (Super Admin Dashboard)

**Daily monitoring:**
```
1. Check global statistics:
   - Total schools (tenants)
   - Total users
   - Active sessions
   - Active tokens

2. Review security alerts:
   - Failed login attempts
   - Suspicious activity
   - Security violations

3. Monitor top tenants:
   - Schools with most users
   - Most active schools

4. Monitor top applications:
   - Most used OAuth clients
   - Token usage statistics

5. Quick actions:
   - Manage tenants
   - Review users globally
   - Manage applications
```

### School Admin Tasks

**Go to:** `/dashboard`

**Daily operations:**
```
1. View school dashboard:
   - Total users in school
   - Active roles
   - Recent activity

2. User management:
   - Invite new users
   - Assign roles
   - Deactivate users
   - Reset passwords

3. Monitor sessions:
   - View active sessions
   - Check connected apps
   - Revoke suspicious sessions

4. Review audit logs:
   - User activities
   - Login attempts
   - Permission changes
```

---

## 🔐 SSO Login Flow (Complete)

### User Journey: Login to LMS

```
┌─────────────────────────────────────────────────────┐
│  1. User opens LMS (lms.school.com)                 │
└─────────────────────────────────────────────────────┘
                    ↓
        User clicks "Login with School Account"
                    ↓
┌─────────────────────────────────────────────────────┐
│  2. LMS redirects to Identity Provider              │
│     GET /api/oauth/authorize                        │
│     ?client_id=client_abc123                        │
│     &redirect_uri=https://lms.../callback           │
│     &scope=openid profile email grades:read         │
│     &state=random123                                │
│     &code_challenge=SHA256(verifier)                │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  3. Identity Provider checks authentication         │
│     - Not logged in? → Show login page             │
│     - Already logged in? → Check consent           │
└─────────────────────────────────────────────────────┘
                    ↓
         User enters: email + password
                    ↓
┌─────────────────────────────────────────────────────┐
│  4. Authentication Success                          │
│     ✅ Verify credentials (Supabase Auth)           │
│     ✅ Create SSO session (sso_sessions)            │
│     ✅ Store device info (browser, OS, IP)          │
│     ✅ Set SSO cookie (sso_session_token)           │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  5. Show Consent Screen (first time only)          │
│     "LMS wants to access:                          │
│      ☑ Your profile (name, photo)                  │
│      ☑ Your email address                          │
│      ☑ Read your grades"                           │
│                                                     │
│     [Authorize] [Cancel]                           │
└─────────────────────────────────────────────────────┘
                    ↓
           User clicks "Authorize"
                    ↓
┌─────────────────────────────────────────────────────┐
│  6. Generate Authorization Code                     │
│     - Create oauth_authorization_codes              │
│     - Code expires in 10 minutes                    │
│     - One-time use only                             │
│     - Store PKCE code_challenge                     │
│     - Save user consent                             │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  7. Redirect back to LMS with code                 │
│     https://lms.../callback                         │
│     ?code=AUTH_CODE_123                             │
│     &state=random123                                │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  8. LMS exchanges code for tokens (Backend)        │
│     POST /api/oauth/token                          │
│     {                                               │
│       grant_type: "authorization_code",            │
│       code: "AUTH_CODE_123",                       │
│       redirect_uri: "https://lms.../callback",     │
│       client_id: "client_abc123",                  │
│       client_secret: "secret_xyz789",              │
│       code_verifier: "PKCE_VERIFIER"               │
│     }                                               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  9. Identity Provider returns tokens               │
│     {                                               │
│       access_token: "eyJhbG...",  (JWT, 1h)        │
│       refresh_token: "refresh_...", (30 days)      │
│       id_token: "eyJhbG...",     (OpenID)          │
│       token_type: "Bearer",                        │
│       expires_in: 3600,                            │
│       scope: "openid profile email grades:read"    │
│     }                                               │
│                                                     │
│     Database updates:                               │
│     ✅ Store in oauth_access_tokens                 │
│     ✅ Store in oauth_refresh_tokens                │
│     ✅ Connect app to SSO session                   │
│     ✅ Delete authorization code (one-time use)     │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  10. LMS gets user info                            │
│      GET /api/oauth/userinfo                       │
│      Authorization: Bearer eyJhbG...               │
│                                                     │
│      Response:                                      │
│      {                                              │
│        sub: "user-id",                             │
│        email: "student@school.com",                │
│        name: "John Student",                       │
│        picture: "https://...",                     │
│        email_verified: true,                       │
│        tenant_id: "tenant-id",                     │
│        tenant_name: "Main School",                 │
│        role: "student",                            │
│        permissions: ["grades:read"]                │
│      }                                              │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  11. User logged into LMS! ✅                       │
│      - LMS creates local session                   │
│      - User can access courses, grades, etc.       │
│      - Token stored securely                       │
└─────────────────────────────────────────────────────┘
```

### Seamless SSO: Access Second App

**User opens Grading System (while still logged in):**

```
User clicks "Open Grading System"
     ↓
Grading System → Identity Provider (/oauth/authorize)
     ↓
Identity Provider checks:
  ✅ SSO session exists (cookie valid)
  ✅ User already consented to this app
  ✅ Scopes match previous consent
     ↓
Auto-approve! ⚡ (NO login page, NO consent screen)
     ↓
Generate authorization code
     ↓
Redirect to Grading System with code
     ↓
Grading System exchanges code for tokens
     ↓
User logged into Grading System! ✅
     ↓
Connected app added to SSO session
```

**Database updates:**
```sql
INSERT INTO sso_connected_apps (
  sso_session_id,
  client_id,
  logout_url,
  connected_at
) VALUES (
  '<sso-session-id>',
  'grading_system_client',
  'https://grading.school.com/logout',
  now()
);
```

---

## 🚪 Single Logout Flow

### User logs out from any app:

```
User clicks Logout in LMS
     ↓
LMS calls: POST /api/auth/logout
     ↓
Identity Provider:
  1. Get SSO session by cookie
  2. Get all connected apps:
     - LMS
     - Grading System
     - Library System
  3. Revoke SSO session (set expires_at = now)
  4. Log logout activity
     ↓
Notify all apps in parallel:
  → POST https://lms.school.com/logout
     {session_token: "sso_xxx", event: "sso.logout"}
  → POST https://grading.school.com/logout
     {session_token: "sso_xxx", event: "sso.logout"}
  → POST https://library.school.com/logout
     {session_token: "sso_xxx", event: "sso.logout"}
     ↓
Each app:
  - Receives logout notification
  - Logs out user locally
  - Clears local session
  - Returns 200 OK
     ↓
Identity Provider:
  - Clear SSO session cookie
  - Redirect to login page
     ↓
User logged out from ALL apps! ✅
```

**Database updates:**
```sql
-- Revoke SSO session
UPDATE sso_sessions
SET expires_at = now()
WHERE session_token = '<token>';

-- Log logout activity
INSERT INTO sso_session_activity (
  sso_session_id,
  activity_type,
  ip_address,
  user_agent
) VALUES (
  '<session-id>',
  'logout',
  '<ip>',
  '<user-agent>'
);
```

---

## 📊 Data Creation Order

### Correct Sequence:

```
1. tenants
   - Main School, Springfield HS, etc.
     ↓
2. roles (auto via create_default_roles function)
   - super_admin, admin, teacher, student, parent
     ↓
3. permissions (seeded)
   - users.*, roles.*, grades.*, etc.
     ↓
4. role_permissions (auto-assigned)
   - Link permissions to roles
     ↓
5. auth.users (via registration)
   - Supabase Auth users
     ↓
6. profiles (auto via trigger)
   - Extended user information
     ↓
7. user_tenants (manual or via invite)
   - Link users to tenants with roles
     ↓
8. oauth_clients (via UI /applications)
   - LMS, Grading, Library, etc.
     ↓
--- Daily Operations Start Here ---
     ↓
9. sso_sessions (via login)
   - Created when user logs in
     ↓
10. oauth_authorization_codes (via OAuth flow)
    - Temporary codes for token exchange
     ↓
11. oauth_access_tokens (via token exchange)
    - Access tokens for API calls
     ↓
12. oauth_refresh_tokens (via token exchange)
    - Refresh tokens for new access tokens
     ↓
13. sso_connected_apps (via OAuth success)
    - Track which apps user has accessed
     ↓
14. oauth_user_consents (via consent screen)
    - Record user consent decisions
     ↓
15. audit_logs (automatic tracking)
    - All important activities logged
     ↓
16. sso_session_activity (automatic tracking)
    - Login, logout, app connections, etc.
```

---

## 💡 Pro Tips

### DO's ✅

- ✅ **Create tenant first** before inviting users
- ✅ **Verify roles exist** before inviting users
- ✅ **Save OAuth client_secret** immediately (shown only once!)
- ✅ **Test OAuth flow** before production
- ✅ **Invite school admins first**, then teachers, then students
- ✅ **Use bulk import** for large user bases (50+ users)
- ✅ **Monitor sessions** regularly for suspicious activity
- ✅ **Review audit logs** daily for security
- ✅ **Backup database** before major changes

### DON'Ts ❌

- ❌ **Don't invite users** before creating tenant
- ❌ **Don't lose client_secret** (can't retrieve later!)
- ❌ **Don't assign super_admin** to everyone
- ❌ **Don't skip testing** OAuth flow
- ❌ **Don't register applications** before having test users
- ❌ **Don't ignore security alerts** in dashboard
- ❌ **Don't share super_admin** credentials
- ❌ **Don't forget to revoke** sessions for departed users

---

## 🆘 Troubleshooting

### Common Issues

**Issue 1: Can't invite users**
```
Problem: "Tenant not found" error
Solution: Create tenant first at /tenants
```

**Issue 2: OAuth flow fails**
```
Problem: "Invalid redirect_uri"
Solution: Check redirect_uri matches exactly what's registered
```

**Issue 3: User can't login**
```
Problem: "User not found"
Solution: Check user_tenants table - user must be linked to tenant
```

**Issue 4: Permissions denied**
```
Problem: "Insufficient permissions"
Solution: Check role_permissions - ensure role has required permissions
```

**Issue 5: Lost client_secret**
```
Problem: Can't retrieve client_secret
Solution: Generate new credentials:
  1. Go to /applications
  2. Find the application
  3. Click "Regenerate Credentials" (if available)
  OR register as new application
```

---

## 📞 Support

For issues or questions:
- **Dashboard**: Check `/admin` for system health
- **Logs**: Review `/audit-logs` for activity
- **Sessions**: Monitor `/sessions` for active users
- **Documentation**: See `OAUTH-IMPLEMENTATION-GUIDE.md`

---

**Document Version**: 1.0  
**Last Updated**: October 23, 2025  
**Status**: Complete and Production Ready 🚀
