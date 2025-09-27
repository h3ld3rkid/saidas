-- Adicionar campo função na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS function_role text CHECK (function_role IN ('Condutor', 'Socorrista'));

-- Criar trigger para auto-concluir serviços após 3 horas
CREATE OR REPLACE FUNCTION auto_complete_old_services()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auto-completar serviços ativos há mais de 3 horas
  UPDATE vehicle_exits 
  SET status = 'completed',
      updated_at = now()
  WHERE status = 'active' 
    AND departure_date + departure_time::interval < now() - interval '3 hours';
  
  RETURN NULL;
END;
$$;

-- Criar trigger que executa a cada insert/update para verificar serviços antigos
DROP TRIGGER IF EXISTS trigger_auto_complete_services ON vehicle_exits;
CREATE TRIGGER trigger_auto_complete_services
  AFTER INSERT OR UPDATE ON vehicle_exits
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_complete_old_services();

-- Modificar RLS para esconder dados sensíveis de serviços concluídos há mais de 3h
DROP POLICY IF EXISTS "Users can view their own exits" ON vehicle_exits;
DROP POLICY IF EXISTS "Mods and admins can view all exits" ON vehicle_exits;

CREATE POLICY "Users can view their own exits" 
ON vehicle_exits 
FOR SELECT 
USING (
  auth.uid() = user_id AND (
    status != 'completed' OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    (status = 'completed' AND departure_date + departure_time::interval >= now() - interval '3 hours')
  )
);

CREATE POLICY "Mods and admins can view all exits" 
ON vehicle_exits 
FOR SELECT 
USING (
  (has_role(auth.uid(), 'mod'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND (
    status != 'completed' OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    (status = 'completed' AND departure_date + departure_time::interval >= now() - interval '3 hours')
  )
);

-- Função para obter dados limitados de serviços concluídos há mais de 3h
CREATE OR REPLACE FUNCTION get_limited_exit_data(exit_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  vehicle_id uuid,
  departure_date date,
  departure_time time,
  exit_type text,
  service_number integer,
  total_service_number integer,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ve.id,
    ve.user_id,
    ve.vehicle_id,
    ve.departure_date,
    ve.departure_time,
    ve.exit_type,
    ve.service_number,
    ve.total_service_number,
    ve.status,
    ve.created_at,
    ve.updated_at
  FROM vehicle_exits ve
  WHERE ve.id = exit_id
    AND ve.status = 'completed'
    AND ve.departure_date + ve.departure_time::interval < now() - interval '3 hours'
    AND NOT has_role(auth.uid(), 'admin'::app_role);
$$;