-- Clean up duplicate user roles, keeping only the highest priority role for each user
WITH ranked_roles AS (
  SELECT 
    id,
    user_id,
    role,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE role
          WHEN 'admin' THEN 1
          WHEN 'mod' THEN 2
          WHEN 'user' THEN 3
        END
    ) as rn
  FROM public.user_roles
)
DELETE FROM public.user_roles 
WHERE id IN (
  SELECT id FROM ranked_roles WHERE rn > 1
);