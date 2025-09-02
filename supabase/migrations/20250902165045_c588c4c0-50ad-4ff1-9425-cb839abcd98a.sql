
-- Adicionar colunas para numeração sequencial
ALTER TABLE vehicle_exits 
ADD COLUMN service_number INTEGER,
ADD COLUMN total_service_number INTEGER;

-- Criar tabela para controlar numeração por tipo de serviço
CREATE TABLE service_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL UNIQUE,
  current_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para contador total de serviços
CREATE TABLE total_service_counter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir contador total inicial
INSERT INTO total_service_counter (current_number) VALUES (0);

-- Inserir contadores iniciais para cada tipo de serviço
INSERT INTO service_counters (service_type, current_number) VALUES 
('Emergencia/CODU', 0),
('Emergencia particular', 0),
('VLS', 0),
('Outro', 0);

-- Função para obter próximo número de serviço
CREATE OR REPLACE FUNCTION get_next_service_number(p_service_type TEXT)
RETURNS TABLE(service_num INTEGER, total_num INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_num INTEGER;
  v_total_num INTEGER;
BEGIN
  -- Incrementar contador do tipo de serviço
  UPDATE service_counters 
  SET current_number = current_number + 1,
      updated_at = now()
  WHERE service_type = p_service_type
  RETURNING current_number INTO v_service_num;
  
  -- Se o tipo não existe, criar
  IF v_service_num IS NULL THEN
    INSERT INTO service_counters (service_type, current_number)
    VALUES (p_service_type, 1)
    RETURNING current_number INTO v_service_num;
  END IF;
  
  -- Incrementar contador total
  UPDATE total_service_counter 
  SET current_number = current_number + 1,
      updated_at = now()
  RETURNING current_number INTO v_total_num;
  
  RETURN QUERY SELECT v_service_num, v_total_num;
END;
$$;

-- Função para atualizar numeração quando tipo de serviço muda
CREATE OR REPLACE FUNCTION update_service_number_on_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_num INTEGER;
BEGIN
  -- Se o tipo de serviço mudou
  IF OLD.exit_type IS DISTINCT FROM NEW.exit_type THEN
    -- Obter novo número para o novo tipo
    UPDATE service_counters 
    SET current_number = current_number + 1,
        updated_at = now()
    WHERE service_type = NEW.exit_type
    RETURNING current_number INTO v_service_num;
    
    -- Se o tipo não existe, criar
    IF v_service_num IS NULL THEN
      INSERT INTO service_counters (service_type, current_number)
      VALUES (NEW.exit_type, 1)
      RETURNING current_number INTO v_service_num;
    END IF;
    
    NEW.service_number = v_service_num;
    -- Manter o total_service_number inalterado
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atualização de numeração
CREATE TRIGGER update_service_number_trigger
  BEFORE UPDATE ON vehicle_exits
  FOR EACH ROW
  EXECUTE FUNCTION update_service_number_on_type_change();

-- RLS para as novas tabelas
ALTER TABLE service_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE total_service_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view service counters" ON service_counters FOR SELECT USING (true);
CREATE POLICY "Authenticated can view total counter" ON total_service_counter FOR SELECT USING (true);
CREATE POLICY "System can update counters" ON service_counters FOR UPDATE USING (true);
CREATE POLICY "System can update total counter" ON total_service_counter FOR UPDATE USING (true);
CREATE POLICY "System can insert counters" ON service_counters FOR INSERT WITH CHECK (true);
