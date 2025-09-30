-- Drop existing SELECT policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy: All authenticated users can view basic profile info (names)
-- This allows users and mods to see names of other users for crew/readiness features
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: UPDATE policies remain unchanged - users can only update their own profile or admins can update all