-- Adicionar coluna inem_si à tabela vehicle_exits se não existir
ALTER TABLE vehicle_exits ADD COLUMN IF NOT EXISTS inem_si boolean DEFAULT false;