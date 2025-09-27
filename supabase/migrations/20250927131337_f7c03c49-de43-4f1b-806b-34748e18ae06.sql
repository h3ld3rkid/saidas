-- Sanitize existing vehicle_exits crew values to contain only UUIDs
UPDATE public.vehicle_exits
SET crew = NULLIF(trim(BOTH FROM array_to_string(ARRAY(
  SELECT DISTINCT m[1]
  FROM regexp_matches(coalesce(crew,''), '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})', 'g') AS m
), ', ')), '')
WHERE crew IS NOT NULL;

-- Ensure creator is included in crew for access and notifications
UPDATE public.vehicle_exits
SET crew = CASE
  WHEN coalesce(crew,'') = '' THEN user_id::text
  WHEN NOT EXISTS (
    SELECT 1 FROM regexp_matches(coalesce(crew,''), (user_id::text), 'g')
  ) THEN crew || ', ' || user_id::text
  ELSE crew
END;