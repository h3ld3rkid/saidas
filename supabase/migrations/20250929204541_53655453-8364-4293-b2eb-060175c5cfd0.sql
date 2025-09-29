-- Atualizar função para auto-completar serviços baseado em created_at (3 horas após criação)
CREATE OR REPLACE FUNCTION public.auto_complete_old_services()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Marcar como concluídos todos os serviços ativos que foram criados há mais de 3h
  UPDATE vehicle_exits 
  SET status = 'completed', 
      updated_at = now()
  WHERE status = 'active' 
    AND created_at < (now() - interval '3 hours');
END;
$$;

-- Atualizar políticas RLS para impedir edição de serviços criados há mais de 3h (exceto admins)
DROP POLICY IF EXISTS "Crew can update assigned exits" ON vehicle_exits;
DROP POLICY IF EXISTS "Users can update status to completed only" ON vehicle_exits;
DROP POLICY IF EXISTS "Users update own recent or active exits" ON vehicle_exits;

-- Crew pode atualizar saídas onde estão atribuídos (serviços ativos OU concluídos há menos de 3h da criação)
CREATE POLICY "Crew can update assigned exits"
ON vehicle_exits
FOR UPDATE
USING (
  crew IS NOT NULL 
  AND crew != '' 
  AND auth.uid()::text IN (
    SELECT trim(both from unnest(string_to_array(crew, ',')))::uuid::text
  )
  AND (
    status != 'completed' 
    OR created_at >= (now() - interval '3 hours')
  )
)
WITH CHECK (
  crew IS NOT NULL 
  AND crew != '' 
  AND auth.uid()::text IN (
    SELECT trim(both from unnest(string_to_array(crew, ',')))::uuid::text
  )
  AND (
    status != 'completed' 
    OR created_at >= (now() - interval '3 hours')
  )
);

-- Usuários podem atualizar para concluído apenas
CREATE POLICY "Users can update status to completed only"
ON vehicle_exits
FOR UPDATE
USING (
  (
    auth.uid() = user_id 
    OR (
      crew IS NOT NULL 
      AND crew != '' 
      AND auth.uid()::text IN (
        SELECT trim(both from unnest(string_to_array(crew, ',')))::uuid::text
      )
    )
  )
  AND (
    status = 'active' 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR created_at >= (now() - interval '3 hours')
  )
)
WITH CHECK (
  (status = 'active' AND has_role(auth.uid(), 'admin'::app_role))
  OR (
    status = 'completed' 
    AND (
      auth.uid() = user_id 
      OR (
        crew IS NOT NULL 
        AND crew != '' 
        AND auth.uid()::text IN (
          SELECT trim(both from unnest(string_to_array(crew, ',')))::uuid::text
        )
      )
    )
    AND created_at >= (now() - interval '3 hours')
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Usuários podem atualizar suas próprias saídas recentes ou ativas
CREATE POLICY "Users update own recent or active exits"
ON vehicle_exits
FOR UPDATE
USING (
  (
    auth.uid() = user_id 
    AND (
      status = 'active' 
      OR created_at >= (now() - interval '3 hours')
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (
    auth.uid() = user_id 
    AND (
      status = 'active' 
      OR created_at >= (now() - interval '3 hours')
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);