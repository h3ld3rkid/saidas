-- Adicionar mais freguesias para os concelhos que estão vazios

-- Freguesias para Caminha
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Caminha'),
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Moledo'),
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Vila Praia de Âncora'),
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Dem'),
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Cristelo'),
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Lanhelas'),
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Riba de Âncora'),
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Seixas'),
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Venade'),
((SELECT id FROM concelhos WHERE nome = 'Caminha'), 'Vilar de Mouros')
ON CONFLICT DO NOTHING;

-- Freguesias para Arcos de Valdevez
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Arcos de Valdevez'),
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Cabreiro'),
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Gavieira'),
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Giela'),
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Grade'),
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Linhares'),
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Mezio'),
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Paçô'),
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Padreiro'),
((SELECT id FROM concelhos WHERE nome = 'Arcos de Valdevez'), 'Sistelo')
ON CONFLICT DO NOTHING;

-- Freguesias para Porto (cidade)
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Aldoar'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Bonfim'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Campanhã'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Cedofeita'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Foz do Douro'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Lordelo do Ouro'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Massarelos'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Miragaia'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Nevogilde'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Paranhos'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Ramalde'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Santo Ildefonso'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'São Nicolau'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Sé'),
((SELECT id FROM concelhos WHERE nome = 'Porto'), 'Vitória')
ON CONFLICT DO NOTHING;

-- Freguesias para Gondomar
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'Gondomar'),
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'Baguim do Monte'),
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'Covelo'),
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'Fânzeres'),
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'Lomba'),
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'Melres'),
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'Rio Tinto'),
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'São Cosme'),
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'São Pedro da Cova'),
((SELECT id FROM concelhos WHERE nome = 'Gondomar'), 'Valbom')
ON CONFLICT DO NOTHING;

-- Freguesias para Mirandela
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Mirandela'),
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Abambres'),
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Avidagos'),
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Barcel'),
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Cedães'),
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Fradizela'),
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Franco'),
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Lamas de Orelhão'),
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Mascarenhas'),
((SELECT id FROM concelhos WHERE nome = 'Mirandela'), 'Múrias')
ON CONFLICT DO NOTHING;