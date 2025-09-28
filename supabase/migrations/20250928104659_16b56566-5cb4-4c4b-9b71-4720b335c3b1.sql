-- Adicionar concelhos e freguesias para Viana do Castelo, Braga, Vila Real, Bragança e Porto

-- Viana do Castelo - Concelhos
INSERT INTO concelhos (distrito_id, nome) VALUES
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Arcos de Valdevez'),
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Caminha'),
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Melgaço'),
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Monção'),
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Paredes de Coura'),
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Ponte da Barca'),
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Ponte de Lima'),
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Valença'),
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Viana do Castelo'),
((SELECT id FROM distritos WHERE nome = 'Viana do Castelo'), 'Vila Nova de Cerveira')
ON CONFLICT DO NOTHING;

-- Vila Real - Concelhos
INSERT INTO concelhos (distrito_id, nome) VALUES
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Alijó'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Boticas'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Chaves'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Mesão Frio'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Mondim de Basto'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Montalegre'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Murça'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Peso da Régua'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Ribeira de Pena'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Sabrosa'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Santa Marta de Penaguião'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Valpaços'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Vila Pouca de Aguiar'),
((SELECT id FROM distritos WHERE nome = 'Vila Real'), 'Vila Real')
ON CONFLICT DO NOTHING;

-- Bragança - Concelhos
INSERT INTO concelhos (distrito_id, nome) VALUES
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Alfândega da Fé'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Bragança'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Carrazeda de Ansiães'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Freixo de Espada à Cinta'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Macedo de Cavaleiros'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Miranda do Douro'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Mirandela'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Mogadouro'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Torre de Moncorvo'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Vila Flor'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Vimioso'),
((SELECT id FROM distritos WHERE nome = 'Bragança'), 'Vinhais')
ON CONFLICT DO NOTHING;

-- Mais concelhos para o Porto (completando)
INSERT INTO concelhos (distrito_id, nome) VALUES
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Espinho'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Oliveira de Azeméis')
ON CONFLICT DO NOTHING;

-- Freguesias para Viana do Castelo (cidade)
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Santa Maria Maior'),
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Monserrate'),
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Areosa'),
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Carreço'),
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Darque'),
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Mazarefes'),
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Meadela'),
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Neiva'),
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Perre'),
((SELECT id FROM concelhos WHERE nome = 'Viana do Castelo'), 'Subportela')
ON CONFLICT DO NOTHING;

-- Freguesias para Ponte de Lima
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Ponte de Lima'),
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Arcozelo'),
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Arca'),
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Ardegão'),
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Boivães'),
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Cabração'),
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Correlhã'),
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Facha'),
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Feitosa'),
((SELECT id FROM concelhos WHERE nome = 'Ponte de Lima'), 'Fornelos')
ON CONFLICT DO NOTHING;

-- Freguesias para Chaves
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'Santa Cruz'),
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'Santa Maria Maior'),
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'Madalena'),
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'São João de Deus'),
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'Anelhe'),
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'Bustelo'),
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'Cela'),
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'Ervededo'),
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'Faiões'),
((SELECT id FROM concelhos WHERE nome = 'Chaves'), 'Loivos')
ON CONFLICT DO NOTHING;

-- Freguesias para Vila Real
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'Nossa Senhora da Conceição'),
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'São Dinis'),
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'São Pedro'),
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'Abaças'),
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'Adoufe'),
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'Arroios'),
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'Borbela'),
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'Campeã'),
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'Constantim'),
((SELECT id FROM concelhos WHERE nome = 'Vila Real'), 'Folhadela')
ON CONFLICT DO NOTHING;

-- Freguesias para Bragança
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'Sé'),
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'Santa Maria'),
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'São Julião de Palácios'),
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'Alfaião'),
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'Aveleda'),
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'Baçal'),
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'Castrelos'),
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'Donai'),
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'Espinhosela'),
((SELECT id FROM concelhos WHERE nome = 'Bragança'), 'França')
ON CONFLICT DO NOTHING;

-- Freguesias para Matosinhos
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'Matosinhos'),
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'Leça da Palmeira'),
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'São Mamede de Infesta'),
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'Senhora da Hora'),
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'Custóias'),
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'Leça do Balio'),
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'Perafita'),
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'Lavra'),
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'Santa Cruz do Bispo'),
((SELECT id FROM concelhos WHERE nome = 'Matosinhos'), 'Guifões')
ON CONFLICT DO NOTHING;

-- Freguesias para Vila Nova de Gaia
INSERT INTO freguesias (concelho_id, nome) VALUES
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'Santa Marinha'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'São Félix da Marinha'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'Madalena'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'Oliveira do Douro'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'Canidelo'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'Gulpilhares'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'Valadares'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'Vilar de Andorinho'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'Arcozelo'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Gaia'), 'Avintes')
ON CONFLICT DO NOTHING;