-- Fix the status constraint issue
-- Drop the existing constraint if it exists
ALTER TABLE vehicle_exits 
DROP CONSTRAINT IF EXISTS vehicle_exits_status_check;

-- Add proper constraint for status values that match the app
ALTER TABLE vehicle_exits 
ADD CONSTRAINT vehicle_exits_status_check 
CHECK (status IN ('active', 'completed', 'cancelled'));