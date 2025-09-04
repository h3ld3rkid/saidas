-- Insert Portuguese districts (North region)
INSERT INTO distritos (nome) VALUES 
('Aveiro'),
('Braga'),
('Bragança'),
('Porto'),
('Viana do Castelo'),
('Vila Real'),
('Viseu');

-- Insert municipalities for Braga district
INSERT INTO concelhos (nome, distrito_id) 
SELECT municipio, d.id 
FROM (VALUES 
  ('Amares'),
  ('Barcelos'),
  ('Braga'),
  ('Cabeceiras de Basto'),
  ('Celorico de Basto'),
  ('Esposende'),
  ('Fafe'),
  ('Guimarães'),
  ('Póvoa de Lanhoso'),
  ('Terras de Bouro'),
  ('Vieira do Minho'),
  ('Vila Nova de Famalicão'),
  ('Vila Verde'),
  ('Vizela')
) AS municipalities(municipio)
CROSS JOIN distritos d
WHERE d.nome = 'Braga';

-- Insert parishes for Amares municipality
INSERT INTO freguesias (nome, concelho_id)
SELECT freguesia, c.id
FROM (VALUES
  ('Amares e Figueiredo'),
  ('Barreiros e Tradição'),
  ('Besteiros'),
  ('Bouro (Santa Maria)'),
  ('Bouro (Santa Marta)'),
  ('Caldelas'),
  ('Carrazedo'),
  ('Dornelas'),
  ('Ferreiros'),
  ('Goães'),
  ('Paranhos'),
  ('Paredes Secas'),
  ('Portela e Extremo'),
  ('Processos'),
  ('Rendufe'),
  ('Torre')
) AS parishes(freguesia)
CROSS JOIN concelhos c 
INNER JOIN distritos d ON c.distrito_id = d.id
WHERE c.nome = 'Amares' AND d.nome = 'Braga';

-- Insert some sample streets for Amares parishes
INSERT INTO ruas (nome, freguesia_id)
SELECT rua, f.id
FROM (VALUES
  ('Rua Principal'),
  ('Rua da Igreja'),
  ('Rua do Cruzeiro'),
  ('Rua da Escola'),
  ('Rua do Cemitério'),
  ('Rua Nova'),
  ('Rua de Santa Cruz'),
  ('Rua do Pinhal'),
  ('Rua da Ponte'),
  ('Rua do Campo'),
  ('Avenida da República'),
  ('Rua 25 de Abril'),
  ('Rua Dr. António Cândido'),
  ('Rua da Liberdade'),
  ('Rua do Souto')
) AS streets(rua)
CROSS JOIN freguesias f
INNER JOIN concelhos c ON f.concelho_id = c.id
INNER JOIN distritos d ON c.distrito_id = d.id
WHERE c.nome = 'Amares' AND d.nome = 'Braga';