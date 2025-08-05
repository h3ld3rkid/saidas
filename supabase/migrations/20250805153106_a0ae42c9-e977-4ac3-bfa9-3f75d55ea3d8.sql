-- Add new columns to vehicle_exits table to match the form requirements
ALTER TABLE public.vehicle_exits 
ADD COLUMN IF NOT EXISTS exit_type text,
ADD COLUMN IF NOT EXISTS patient_name text,
ADD COLUMN IF NOT EXISTS patient_age integer,
ADD COLUMN IF NOT EXISTS patient_contact text,
ADD COLUMN IF NOT EXISTS patient_gender text,
ADD COLUMN IF NOT EXISTS patient_district text,
ADD COLUMN IF NOT EXISTS patient_municipality text,
ADD COLUMN IF NOT EXISTS patient_parish text,
ADD COLUMN IF NOT EXISTS patient_address text,
ADD COLUMN IF NOT EXISTS ambulance_number text,
ADD COLUMN IF NOT EXISTS crew text,
ADD COLUMN IF NOT EXISTS is_pem boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_reserve boolean DEFAULT false;