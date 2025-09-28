-- Atualizar políticas RLS para restringir alteração de status apenas a admins
-- e implementar auto-conclusão de serviços após 3h

-- 1. Criar função para auto-completar serviços após 3h
CREATE OR REPLACE FUNCTION public.auto_complete_old_services()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marcar como concluídos todos os serviços ativos que tenham mais de 3h
  UPDATE vehicle_exits 
  SET status = 'completed', 
      updated_at = now()
  WHERE status = 'active' 
    AND (departure_date + departure_time::interval) < (now() - interval '3 hours');
END;
$$;

-- 2. Criar política específica para alteração de status
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'vehicle_exits' AND policyname = 'Users can update status to completed only'
  ) THEN
    DROP POLICY "Users can update status to completed only" ON public.vehicle_exits;
  END IF;
END $$;

CREATE POLICY "Users can update status to completed only"
  ON public.vehicle_exits
  FOR UPDATE
  USING (
    (auth.uid() = user_id OR 
     (COALESCE(crew, '') <> '' AND (auth.uid())::text IN (
       SELECT (TRIM(BOTH FROM unnest(string_to_array(crew, ','))))::uuid::text
     ))) 
    AND 
    (status = 'active' OR 
     has_role(auth.uid(), 'admin'::app_role) OR
     (status = 'completed' AND (departure_date + departure_time::interval) >= (now() - '03:00:00'::interval)))
  )
  WITH CHECK (
    -- Apenas admins podem reativar serviços concluídos
    (status = 'active' AND has_role(auth.uid(), 'admin'::app_role)) OR
    -- Todos podem marcar como concluído se for o owner/crew e ainda não passou 3h
    (status = 'completed' AND 
     (auth.uid() = user_id OR 
      (COALESCE(crew, '') <> '' AND (auth.uid())::text IN (
        SELECT (TRIM(BOTH FROM unnest(string_to_array(crew, ','))))::uuid::text
      ))) AND
     (departure_date + departure_time::interval) >= (now() - '03:00:00'::interval)) OR
    -- Admins podem fazer qualquer alteração
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Atualizar política existente de update para incluir restrição de tempo
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'vehicle_exits' AND policyname = 'Users update own recent or active exits'
  ) THEN
    DROP POLICY "Users update own recent or active exits" ON public.vehicle_exits;
  END IF;
END $$;

CREATE POLICY "Users update own recent or active exits"
  ON public.vehicle_exits
  FOR UPDATE
  USING (
    ((auth.uid() = user_id) AND 
     (status = 'active' OR 
      (status = 'completed' AND (departure_date + departure_time::interval) >= (now() - '03:00:00'::interval)))) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    ((auth.uid() = user_id) AND 
     (status = 'active' OR 
      (status = 'completed' AND (departure_date + departure_time::interval) >= (now() - '03:00:00'::interval)))) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Criar trigger para executar auto-complete periodicamente (simulado)
-- Nota: Para execução real periódica, seria necessário usar pg_cron
-- Por agora, vamos executar a função manualmente quando necessário
SELECT public.auto_complete_old_services();