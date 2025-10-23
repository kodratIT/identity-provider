# 🔧 Fix Registration Error

## ❌ Error
**"Database error saving new user"**

## 🔍 Root Cause
This error occurs because of **RLS (Row Level Security) policies** blocking the automatic profile creation during user signup.

**Why it happens:**
1. User signs up → Supabase creates user in `auth.users`
2. Trigger fires → Tries to insert into `profiles` table
3. RLS blocks it → No INSERT policy allows the trigger to run
4. Error returned → User sees "Database error"

---

## ✅ QUICK FIX (5 Minutes)

### Step 1: Run SQL Fix

**Open:** Supabase Dashboard > SQL Editor

**Copy and run:** `fix-registration.sql` (file in project root)

**OR copy this:**

```sql
-- 1. Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop existing function if any  
DROP FUNCTION IF EXISTS create_profile_on_signup();

-- 3. Create new function with proper permissions
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER
SECURITY DEFINER -- This is KEY! Runs with creator permissions
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error creating profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_on_signup();

-- 5. Fix RLS policies for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create new policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role full access (for triggers)
CREATE POLICY "Service role has full access"
  ON profiles
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### Option 2: Disable RLS Temporarily (For Testing Only!)

**⚠️ WARNING: Only for development/testing!**

```sql
-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

---

## 🎯 Understanding The Issue

### Why It Happens

1. **User signs up** → Supabase Auth creates user in `auth.users`
2. **Trigger fires** → Tries to create profile in `profiles` table
3. **RLS blocks it** → Because trigger runs without proper context
4. **Error occurs** → User created but profile not created

### The Fix

The key is **`SECURITY DEFINER`**:
- Makes function run with **creator's permissions** (not trigger's)
- Bypasses RLS during automatic profile creation
- Still secure because it's a controlled function

---

## 🧪 Test Registration Again

After running the SQL above:

1. Go to your app: http://localhost:3000/register
2. Fill form:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
3. Submit
4. Check email for verification link
5. Click link
6. Should work! ✅

---

## 🔍 Verify Database

Check if profile was created:

```sql
-- In Supabase SQL Editor
SELECT 
  u.email,
  p.full_name,
  p.created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 5;
```

You should see your test user with profile! ✅

---

## 📋 Alternative: Manual Profile Creation

If trigger still doesn't work, you can create profiles manually in your code:

**Update: `src/app/(auth)/register/page.tsx`**

```typescript
// After successful signup
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName },
  },
})

if (error) throw error

// Manually create profile (if trigger fails)
if (data.user) {
  await supabase.from('profiles').insert({
    id: data.user.id,
    full_name: fullName,
  }).select().single()
}

setSuccess(true)
```

But the SQL fix above is better! ✅

---

## ✅ Complete Solution Checklist

- [ ] Run SQL script above in Supabase
- [ ] Verify trigger exists: `\df create_profile_on_signup` 
- [ ] Test registration flow
- [ ] Check profile created in database
- [ ] Verify login works after registration

---

## 🆘 Still Getting Error?

### Check These:

1. **Is database schema executed?**
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('profiles', 'tenants', 'roles');
   ```
   Should return 3 rows ✅

2. **Is trigger created?**
   ```sql
   SELECT trigger_name FROM information_schema.triggers 
   WHERE event_object_table = 'users' 
   AND trigger_schema = 'auth';
   ```
   Should return `on_auth_user_created` ✅

3. **Check Supabase Logs**
   - Go to Supabase Dashboard > Logs
   - Look for errors during registration
   - Share the error message

---

## 🎉 After Fix

Registration should work smoothly:
1. User creates account ✅
2. Profile auto-created ✅
3. Email verification sent ✅
4. User can login ✅

**Run the SQL fix above and try registering again!** 🚀
