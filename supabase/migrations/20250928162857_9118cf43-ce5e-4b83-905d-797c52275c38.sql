-- Add ambulance_number to vehicles for better identification
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS ambulance_number TEXT;

-- Optional index to speed up lookups by ambulance number
CREATE INDEX IF NOT EXISTS idx_vehicles_ambulance_number ON public.vehicles (ambulance_number);