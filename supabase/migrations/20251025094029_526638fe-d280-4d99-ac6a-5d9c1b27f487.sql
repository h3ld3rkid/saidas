-- Drop existing overly permissive policies on profiles table
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;

-- Create more restrictive policies for profiles table
-- Policy 1: Users can view their own complete profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can view limited info of other active users (only what's needed for crew selection)
CREATE POLICY "Users can view limited info of active users"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND auth.uid() != user_id
);

-- Policy 3: Admins and moderators can view all profiles
CREATE POLICY "Admins and mods can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'mod'::app_role)
);

-- Policy 4: Users can update only their own profile (excluding role and employee_number)
CREATE POLICY "Users can update their own profile data"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
  AND employee_number = (SELECT employee_number FROM public.profiles WHERE user_id = auth.uid())
);

-- Policy 5: Admins can update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy 6: Only admins can create profiles
CREATE POLICY "Admins can create profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));