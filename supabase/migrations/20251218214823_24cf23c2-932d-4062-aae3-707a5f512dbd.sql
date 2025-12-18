-- Adicionar coluna para rastrear tentativas de login falhadas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;

-- Adicionar coluna para registar quando foi bloqueado
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone DEFAULT NULL;

-- Criar função para resetar tentativas após login bem sucedido
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p
  SET failed_login_attempts = 0
  FROM auth.users au
  WHERE au.id = p.user_id
    AND au.email = user_email;
END;
$$;