-- Drop the constraint to solve user profile duplicates issue
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_employee_number_key;

-- Fix user creation trigger 
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Only create profile and role if they don't exist
  INSERT INTO public.profiles (user_id, first_name, last_name, employee_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'employee_number', 'AUTO_' || EXTRACT(EPOCH FROM NEW.created_at)::text)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Just add Braga parishes if Braga exists
DO $$
DECLARE
    braga_concelho_id UUID;
BEGIN
    SELECT id INTO braga_concelho_id FROM concelhos WHERE nome ILIKE 'Braga' LIMIT 1;
    
    IF braga_concelho_id IS NOT NULL THEN
        -- Simple insert without conflict handling for now
        INSERT INTO freguesias (nome, concelho_id) 
        SELECT nome, braga_concelho_id FROM (VALUES
            ('Adaúfe'),
            ('Arentim e Cunha'),
            ('Aveleda'),
            ('Braga (Maximinos, Sé e Cividade)'),
            ('Braga (São José de São Lázaro e São João do Souto)'),
            ('Braga (São Vicente)'),
            ('Braga (São Victor)'),
            ('Cabreiros'),
            ('Celeirós'),
            ('Dume'),
            ('Espinho'),
            ('Esporões'),
            ('Ferreiros e Gondizalves'),
            ('Frossos'),
            ('Guisande e Oliveira (São Pedro)'),
            ('Lamosa'),
            ('Lamas'),
            ('Morreira e Trandeiras'),
            ('Nogueira, Fraião e Lamaçães'),
            ('Nogueiró e Tenões'),
            ('Padim da Graça'),
            ('Palmeira'),
            ('Panoias de Cima'),
            ('Parada de Tibães'),
            ('Pedralva'),
            ('Priscos'),
            ('Real, Dume e Semelhe'),
            ('Ruilhe'),
            ('Sobreposta'),
            ('Tadim'),
            ('Tebosa'),
            ('Tenões'),
            ('Vilaça e Figueiredo'),
            ('Vimieiro')
        ) AS new_parishes(nome)
        WHERE NOT EXISTS (
            SELECT 1 FROM freguesias 
            WHERE freguesias.nome = new_parishes.nome 
            AND freguesias.concelho_id = braga_concelho_id
        );
    END IF;
END $$;