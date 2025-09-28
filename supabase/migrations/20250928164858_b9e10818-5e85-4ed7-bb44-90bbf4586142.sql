-- Atualizar políticas RLS para permitir que todos os usuários autenticados vejam alertas de prontidão

-- Verificar se a política já existe e removê-la se necessário
DROP POLICY IF EXISTS "Users can view all readiness alerts" ON readiness_alerts;

-- Criar nova política para permitir que todos os usuários autenticados vejam alertas
CREATE POLICY "Authenticated users can view all readiness alerts"
ON readiness_alerts
FOR SELECT
TO authenticated
USING (true);

-- Verificar se existe política para permitir que todos vejam as respostas
DROP POLICY IF EXISTS "Users can view all responses" ON readiness_responses;

-- Criar nova política para permitir que todos os usuários autenticados vejam as respostas
CREATE POLICY "Authenticated users can view all responses"
ON readiness_responses  
FOR SELECT
TO authenticated
USING (true);