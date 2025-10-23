-- ============================================
-- FIX USER REGISTRATION ERROR
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_profile_on_signup();

-- Step 2: Recreate function with proper error handling
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER
SECURITY DEFINER -- KEY: Run with creator's permissions
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
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_on_signup();

-- Step 4: Fix RLS policies for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

-- Create comprehensive policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role full access (needed for triggers)
CREATE POLICY "Service role has full access to profiles"
  ON profiles
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- Check if function exists
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'create_profile_on_signup';

-- Check RLS policies on profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================
-- TEST THE FIX
-- ============================================

-- After running this SQL:
-- 1. Go to your app at http://localhost:3000/register
-- 2. Create a new test account
-- 3. Should work without errors! ✅

-- Verify user and profile created:
SELECT 
  u.id,
  u.email,
  u.created_at as user_created,
  p.full_name,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 5;
