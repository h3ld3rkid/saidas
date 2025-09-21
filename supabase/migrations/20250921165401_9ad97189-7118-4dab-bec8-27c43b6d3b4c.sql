-- Remove duplicate roles - keep only the admin role for this user
DELETE FROM user_roles 
WHERE user_id = 'f0a8225e-1a0e-434b-878d-8acf6979baec' 
AND role = 'user';

-- Add unique constraint to prevent role duplicates
ALTER TABLE user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);