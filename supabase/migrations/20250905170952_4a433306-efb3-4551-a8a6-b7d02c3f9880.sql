-- Clean up duplicate districts
WITH numbered_districts AS (
  SELECT id, nome, ROW_NUMBER() OVER (PARTITION BY nome ORDER BY created_at) as rn
  FROM distritos
)
DELETE FROM distritos 
WHERE id IN (
  SELECT id FROM numbered_districts WHERE rn > 1
);

-- Clean up duplicate municipalities
WITH numbered_concelhos AS (
  SELECT id, nome, ROW_NUMBER() OVER (PARTITION BY nome ORDER BY created_at) as rn
  FROM concelhos
)
DELETE FROM concelhos 
WHERE id IN (
  SELECT id FROM numbered_concelhos WHERE rn > 1
);

-- Clean up duplicate parishes
WITH numbered_freguesias AS (
  SELECT id, nome, concelho_id, ROW_NUMBER() OVER (PARTITION BY nome, concelho_id ORDER BY created_at) as rn
  FROM freguesias
)
DELETE FROM freguesias 
WHERE id IN (
  SELECT id FROM numbered_freguesias WHERE rn > 1
);