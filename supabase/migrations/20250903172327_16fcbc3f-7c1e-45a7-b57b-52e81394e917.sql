-- Check what constraint exists and fix the status values
-- First, let's see what the current constraint allows
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname LIKE '%vehicle_exits_status%';

-- Update the constraint to allow the status values used in the app
ALTER TABLE vehicle_exits 
DROP CONSTRAINT IF EXISTS vehicle_exits_status_check;

-- Add proper constraint for status values
ALTER TABLE vehicle_exits 
ADD CONSTRAINT vehicle_exits_status_check 
CHECK (status IN ('active', 'completed', 'cancelled'));