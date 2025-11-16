-- Fix RLS policy to allow viewing visible dogs from other users
-- This allows Find Match to work while still protecting hidden dogs

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS dogs_select_own ON public.dogs;

-- Create a new SELECT policy that allows:
-- 1. Users to see their own dogs (all of them, including hidden ones)
-- 2. Other users to see only dogs where is_visible = true
CREATE POLICY dogs_select_visible ON public.dogs
  FOR SELECT
  USING (
    user_id = auth.uid()  -- Can see your own dogs
    OR 
    is_visible = true     -- Can see other users' visible dogs
  );

-- Verify the new policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'dogs' AND cmd = 'SELECT';
