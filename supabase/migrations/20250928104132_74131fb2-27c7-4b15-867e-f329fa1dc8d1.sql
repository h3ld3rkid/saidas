-- Adicionar concelhos e freguesias em falta para todos os distritos de Portugal

-- Distritos que precisam de concelhos
INSERT INTO concelhos (distrito_id, nome) VALUES
-- Aveiro
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Águeda'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Albergaria-a-Velha'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Anadia'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Arouca'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Aveiro'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Castelo de Paiva'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Espinho'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Estarreja'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Ílhavo'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Mealhada'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Murtosa'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Oliveira de Azeméis'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Oliveira do Bairro'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Ovar'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Santa Maria da Feira'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'São João da Madeira'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Sever do Vouga'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Vagos'),
((SELECT id FROM distritos WHERE nome = 'Aveiro'), 'Vale de Cambra'),

-- Beja
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Aljustrel'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Almodôvar'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Alvito'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Barrancos'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Beja'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Castro Verde'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Cuba'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Ferreira do Alentejo'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Mértola'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Moura'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Odemira'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Ourique'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Serpa'),
((SELECT id FROM distritos WHERE nome = 'Beja'), 'Vidigueira'),

-- Porto (alguns exemplos principais)
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Amarante'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Baião'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Felgueiras'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Gondomar'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Lousada'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Maia'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Marco de Canaveses'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Matosinhos'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Paços de Ferreira'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Paredes'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Penafiel'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Porto'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Póvoa de Varzim'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Santo Tirso'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Trofa'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Valongo'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Vila do Conde'),
((SELECT id FROM distritos WHERE nome = 'Porto'), 'Vila Nova de Gaia')

ON CONFLICT DO NOTHING;

-- Adicionar algumas freguesias para os concelhos do distrito de Braga que não têm freguesias
INSERT INTO freguesias (concelho_id, nome) VALUES
-- Barcelos
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Barcelos'),
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Abade de Neiva'),
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Aguiar'),
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Aldreu'),
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Alvelos'),
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Arcozelo'),
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Areias de Vilar e Encourados'),
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Aves'),
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Azuara'),
((SELECT id FROM concelhos WHERE nome = 'Barcelos'), 'Balugães'),

-- Fafe
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Fafe'),
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Antime'),
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Ardegão'),
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Arões'),
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Felgueiras'),
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Fornelos'),
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Freitas'),
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Golães'),
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Moreira do Rei'),
((SELECT id FROM concelhos WHERE nome = 'Fafe'), 'Passos'),

-- Guimarães 
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'Oliveira do Castelo'),
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'São Paio'),
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'São Sebastião'),
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'Abação'),
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'Aldão'),
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'Azurém'),
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'Briteiros'),
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'Caldelas'),
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'Candoso'),
((SELECT id FROM concelhos WHERE nome = 'Guimarães'), 'Creixomil'),

-- Vila Nova de Famalicão
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Antas'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Arnoso'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Avidos'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Bairro'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Brufe'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Calendário'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Carreira'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Castelões'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Cruz'),
((SELECT id FROM concelhos WHERE nome = 'Vila Nova de Famalicão'), 'Delães')

ON CONFLICT DO NOTHING;