-- Add display_order column to vehicles table
ALTER TABLE public.vehicles 
ADD COLUMN display_order integer;

-- Set default ordering based on ambulance_number
UPDATE public.vehicles 
SET display_order = CASE 
  WHEN ambulance_number IS NOT NULL THEN ambulance_number::integer 
  ELSE 999 
END
WHERE display_order IS NULL;