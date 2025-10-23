# Setup Instructions - Identity Provider

## 🎯 Quick Setup (30 Minutes)

Follow these steps **in order** to complete the setup.

---

## Step 1: Install Dependencies (5-10 minutes)

```bash
cd "/Users/kodrat/Public/Source Code/SCHOOL/identity-provider-app"

# Install remaining dependencies
npm install typescript @types/react @types/node @types/react-dom \
  tailwindcss postcss autoprefixer eslint eslint-config-next \
  @hookform/resolvers date-fns clsx tailwind-merge lucide-react \
  class-variance-authority tailwindcss-animate
```

**Verify installation:**
```bash
npm list --depth=0
```

You should see all packages listed without errors.

---

## Step 2: Create Supabase Project (5 minutes)

### 2.1 Create Project

1. Go to https://supabase.com
2. Sign in or create account
3. Click "New Project"
4. Fill in:
   - **Organization**: Select or create
   - **Name**: `identity-provider`
   - **Database Password**: Create strong password (save it!)
   - **Region**: Choose closest region
5. Click "Create new project"
6. Wait ~2 minutes for project creation

### 2.2 Get Credentials

1. Go to **Project Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
   - **service_role secret key**: Long string (keep secret!)

### 2.3 Configure Environment

```bash
# Copy template
cp .env.local.example .env.local

# Edit file
nano .env.local
```

Add your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 3: Create Database Schema (5 minutes)

### 3.1 Get SQL Schema

Go to documentation folder:
```bash
cd "../identity-provider/tasks/fullstack/23-10-2025/identity-provider-multi-tenant"
cat plan.md
```

Find **Phase 2: Database Schema & RLS Policies** section.

### 3.2 Execute SQL

1. Go to Supabase Dashboard > **SQL Editor**
2. Click "New query"
3. Copy ALL SQL from plan.md Phase 2:
   - Core Tables Creation
   - Indexes Creation
   - RLS Policies
   - Database Functions
   - Seed Permissions

4. Paste into SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. Wait for success message

### 3.3 Verify Schema

Go to **Table Editor** - you should see:
- ✅ tenants
- ✅ roles
- ✅ permissions
- ✅ role_permissions
- ✅ user_tenants
- ✅ profiles
- ✅ audit_logs

---

## Step 4: Initialize shadcn/ui (2 minutes)

```bash
cd "/Users/kodrat/Public/Source Code/SCHOOL/identity-provider-app"

# Initialize (interactive)
npx shadcn@latest init
```

**Choose these options:**
- Would you like to use TypeScript? › **Yes**
- Which style would you like to use? › **Default**
- Which color would you like to use as base color? › **Slate**
- Where is your global CSS file? › **src/app/globals.css**
- Would you like to use CSS variables for colors? › **Yes**
- Where is your tailwind.config.js located? › **tailwind.config.ts**
- Configure the import alias for components? › **@/components**
- Configure the import alias for utils? › **@/lib/utils**

---

## Step 5: Install UI Components (3 minutes)

```bash
# Install essential components
npx shadcn@latest add button card input label dropdown-menu avatar badge
npx shadcn@latest add dialog sheet separator tabs table toast alert
npx shadcn@latest add form select checkbox switch
```

---

## Step 6: Test Development Server (1 minute)

```bash
# Start server
npm run dev
```

Open browser: http://localhost:3000

You should see the landing page! 🎉

---

## Step 7: Build Authentication (30-60 minutes)

Follow **SUPABASE-AUTH-GUIDE.md**:

1. Create `src/hooks/useAuth.ts`
2. Create `src/hooks/useUser.ts`
3. Create `src/app/(auth)/login/page.tsx`
4. Create `src/app/(auth)/register/page.tsx`
5. Create `src/app/auth/callback/route.ts`

**Copy code directly from the guide - it's production-ready!**

---

## Step 8: Build Dashboard (30-60 minutes)

Follow **SHADCN-DASHBOARD-GUIDE.md**:

1. Create `src/components/layout/DashboardLayout.tsx`
2. Create `src/app/(dashboard)/page.tsx`
3. Create `src/app/(dashboard)/users/page.tsx`
4. Create `src/app/(dashboard)/layout.tsx`

**Copy code directly from the guide - it's production-ready!**

---

## ✅ Verification Checklist

### Dependencies Installed
- [ ] `npm list --depth=0` shows all packages
- [ ] No error messages
- [ ] `typescript`, `tailwindcss`, `lucide-react` visible

### Supabase Setup
- [ ] Project created at supabase.com
- [ ] `.env.local` file exists with credentials
- [ ] Database has 7 tables
- [ ] RLS policies show in Table Editor
- [ ] Permissions table has seed data

### shadcn/ui Setup
- [ ] `components.json` file exists
- [ ] `src/components/ui/` folder exists
- [ ] Components installed successfully

### Development Server
- [ ] `npm run dev` starts without errors
- [ ] http://localhost:3000 shows landing page
- [ ] No console errors in browser
- [ ] Tailwind styles working

---

## 🐛 Common Issues & Solutions

### Issue: npm install timeout
**Solution**:
```bash
# Increase timeout
npm install --timeout=600000

# Or install in smaller groups
npm install typescript @types/react @types/node
npm install tailwindcss postcss autoprefixer
```

### Issue: Supabase connection error
**Solution**:
- Verify `.env.local` has correct values
- Check no extra spaces in environment variables
- Restart dev server: `Ctrl+C` then `npm run dev`

### Issue: shadcn/ui components not found
**Solution**:
```bash
# Verify import alias in tsconfig.json
cat tsconfig.json | grep "@/"

# Should show: "@/*": ["./src/*"]
```

### Issue: Module not found errors
**Solution**:
```bash
# Clear cache and rebuild
rm -rf .next
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 📝 Next Steps After Setup

1. **Test Authentication**:
   - Register a new user
   - Login with email
   - Test password reset
   - Try Google OAuth (if configured)

2. **Create Test Tenant**:
   - Go to Supabase > Table Editor > tenants
   - Click "Insert" > "Insert row"
   - Add: name="Test School", slug="test-school"

3. **Assign User to Tenant**:
   - Go to user_tenants table
   - Create relationship between user and tenant

4. **Test Dashboard**:
   - Login and go to /dashboard
   - Test navigation
   - Test tenant switching

---

## 🎉 Success!

If all checkboxes are checked, you're ready to develop! ✅

**Time to complete**: ~30 minutes

**What you have**:
- ✅ Full Next.js application
- ✅ Supabase authentication
- ✅ Database with RLS
- ✅ shadcn/ui components
- ✅ Production-ready foundation

**Next**: Follow the guides to build features! 🚀

---

Need help? Check:
- **SUPABASE-AUTH-GUIDE.md** - Authentication
- **SHADCN-DASHBOARD-GUIDE.md** - Dashboard UI
- **IMPLEMENTATION-GUIDE.md** - Full guide
- **README.md** - Project overview
