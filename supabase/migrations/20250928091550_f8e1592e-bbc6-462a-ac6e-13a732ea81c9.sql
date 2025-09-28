-- Drop constraints that are blocking the process
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_employee_number_key;

-- Ensure trigger exists for new users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles with unique employee numbers
DO $$
DECLARE
    missing_user RECORD;
    counter INTEGER := 0;
BEGIN
    FOR missing_user IN 
        SELECT au.id, au.created_at
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.user_id = au.id
        WHERE p.user_id IS NULL
    LOOP
        counter := counter + 1;
        INSERT INTO public.profiles (user_id, first_name, last_name, employee_number)
        VALUES (missing_user.id, '', '', 'AUTO_' || counter::text);
    END LOOP;
END $$;

-- Backfill missing user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'user'
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL;

-- Add key parishes for Braga district only if they don't exist
DO $$
DECLARE
    braga_concelho_id UUID;
BEGIN
    SELECT id INTO braga_concelho_id FROM concelhos WHERE nome = 'Braga' LIMIT 1;
    
    IF braga_concelho_id IS NOT NULL THEN
        -- Add key parishes if they don't exist
        IF NOT EXISTS (SELECT 1 FROM freguesias WHERE nome = 'Adaúfe' AND concelho_id = braga_concelho_id) THEN
            INSERT INTO freguesias (nome, concelho_id) VALUES ('Adaúfe', braga_concelho_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM freguesias WHERE nome = 'Braga (Maximinos, Sé e Cividade)' AND concelho_id = braga_concelho_id) THEN
            INSERT INTO freguesias (nome, concelho_id) VALUES ('Braga (Maximinos, Sé e Cividade)', braga_concelho_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM freguesias WHERE nome = 'Priscos' AND concelho_id = braga_concelho_id) THEN
            INSERT INTO freguesias (nome, concelho_id) VALUES ('Priscos', braga_concelho_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM freguesias WHERE nome = 'Palmeira' AND concelho_id = braga_concelho_id) THEN
            INSERT INTO freguesias (nome, concelho_id) VALUES ('Palmeira', braga_concelho_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM freguesias WHERE nome = 'Celeirós' AND concelho_id = braga_concelho_id) THEN
            INSERT INTO freguesias (nome, concelho_id) VALUES ('Celeirós', braga_concelho_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM freguesias WHERE nome = 'Dume' AND concelho_id = braga_concelho_id) THEN
            INSERT INTO freguesias (nome, concelho_id) VALUES ('Dume', braga_concelho_id);
        END IF;
    END IF;
END $$;