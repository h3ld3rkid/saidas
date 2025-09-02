-- Inserir distritos de Portugal
INSERT INTO distritos (nome) VALUES 
('Aveiro'),
('Beja'),
('Braga'),
('Bragança'),
('Castelo Branco'),
('Coimbra'),
('Évora'),
('Faro'),
('Guarda'),
('Leiria'),
('Lisboa'),
('Portalegre'),
('Porto'),
('Santarém'),
('Setúbal'),
('Viana do Castelo'),
('Vila Real'),
('Viseu'),
('Ilha da Madeira'),
('Ilha de Porto Santo'),
('Ilha de Santa Maria'),
('Ilha de São Miguel'),
('Ilha Terceira'),
('Ilha da Graciosa'),
('Ilha de São Jorge'),
('Ilha do Pico'),
('Ilha do Faial'),
('Ilha das Flores'),
('Ilha do Corvo');

-- Inserir alguns concelhos de exemplo (Braga)
INSERT INTO concelhos (nome, distrito_id) 
SELECT 'Amares', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Barcelos', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Braga', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Cabeceiras de Basto', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Celorico de Basto', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Esposende', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Fafe', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Guimarães', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Póvoa de Lanhoso', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Terras de Bouro', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Vieira do Minho', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Vila Nova de Famalicão', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Vila Verde', id FROM distritos WHERE nome = 'Braga'
UNION ALL
SELECT 'Vizela', id FROM distritos WHERE nome = 'Braga';

-- Inserir freguesias de Amares
INSERT INTO freguesias (nome, concelho_id)
SELECT 'Amares e Figueiredo', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Bouro (Santa Marta)', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Bouro (Santa Maria)', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Caldelas', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Carrazedo', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Dornelas', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Ferreiros, Prozelo e Besteiros', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Goães', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Lago', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Paranhos', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Paredes Secas', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Rendufe', id FROM concelhos WHERE nome = 'Amares'
UNION ALL
SELECT 'Torre', id FROM concelhos WHERE nome = 'Amares';

-- Inserir algumas ruas de exemplo para Amares e Figueiredo
INSERT INTO ruas (nome, freguesia_id)
SELECT 'Rua da Igreja', id FROM freguesias WHERE nome = 'Amares e Figueiredo'
UNION ALL
SELECT 'Rua do Comércio', id FROM freguesias WHERE nome = 'Amares e Figueiredo'
UNION ALL
SELECT 'Rua dos Bombeiros Voluntários', id FROM freguesias WHERE nome = 'Amares e Figueiredo'
UNION ALL
SELECT 'Rua da Estação', id FROM freguesias WHERE nome = 'Amares e Figueiredo'
UNION ALL
SELECT 'Rua do Souto', id FROM freguesias WHERE nome = 'Amares e Figueiredo'
UNION ALL
SELECT 'Rua da Ponte', id FROM freguesias WHERE nome = 'Amares e Figueiredo'
UNION ALL
SELECT 'Rua do Centro', id FROM freguesias WHERE nome = 'Amares e Figueiredo'
UNION ALL
SELECT 'Rua Nova', id FROM freguesias WHERE nome = 'Amares e Figueiredo'
UNION ALL
SELECT 'Largo da República', id FROM freguesias WHERE nome = 'Amares e Figueiredo'
UNION ALL
SELECT 'Avenida da Liberdade', id FROM freguesias WHERE nome = 'Amares e Figueiredo';