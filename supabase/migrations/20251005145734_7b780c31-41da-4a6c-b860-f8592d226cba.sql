-- Update Braga district municipalities and parishes

-- First, ensure Braga district exists and get its ID
DO $$
DECLARE
  braga_distrito_id uuid;
  
  -- Municipality IDs
  amares_id uuid;
  barcelos_id uuid;
  braga_id uuid;
  cabeceiras_basto_id uuid;
  celorico_basto_id uuid;
  esposende_id uuid;
  fafe_id uuid;
  guimaraes_id uuid;
  povoa_lanhoso_id uuid;
  terras_bouro_id uuid;
  vieira_minho_id uuid;
  vila_nova_famalicao_id uuid;
  vila_verde_id uuid;
  vizela_id uuid;
BEGIN
  -- Get or create Braga district
  SELECT id INTO braga_distrito_id FROM distritos WHERE nome = 'Braga';
  IF braga_distrito_id IS NULL THEN
    INSERT INTO distritos (nome) VALUES ('Braga') RETURNING id INTO braga_distrito_id;
  END IF;

  -- Delete existing municipalities and parishes for Braga district
  DELETE FROM freguesias WHERE concelho_id IN (SELECT id FROM concelhos WHERE distrito_id = braga_distrito_id);
  DELETE FROM concelhos WHERE distrito_id = braga_distrito_id;

  -- Insert municipalities
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Amares') RETURNING id INTO amares_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Barcelos') RETURNING id INTO barcelos_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Braga') RETURNING id INTO braga_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Cabeceiras de Basto') RETURNING id INTO cabeceiras_basto_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Celorico de Basto') RETURNING id INTO celorico_basto_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Esposende') RETURNING id INTO esposende_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Fafe') RETURNING id INTO fafe_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Guimarães') RETURNING id INTO guimaraes_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Póvoa de Lanhoso') RETURNING id INTO povoa_lanhoso_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Terras de Bouro') RETURNING id INTO terras_bouro_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Vieira do Minho') RETURNING id INTO vieira_minho_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Vila Nova de Famalicão') RETURNING id INTO vila_nova_famalicao_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Vila Verde') RETURNING id INTO vila_verde_id;
  INSERT INTO concelhos (distrito_id, nome) VALUES (braga_distrito_id, 'Vizela') RETURNING id INTO vizela_id;

  -- Insert parishes for Amares (16)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (amares_id, 'Amares e Figueiredo'),
    (amares_id, 'Barreiros'),
    (amares_id, 'Bico'),
    (amares_id, 'Caires'),
    (amares_id, 'Caldelas, Sequeiros e Paranhos'),
    (amares_id, 'Carrazedo'),
    (amares_id, 'Dornelas'),
    (amares_id, 'Ferreiros, Prozelo e Besteiros'),
    (amares_id, 'Fiscal'),
    (amares_id, 'Goães'),
    (amares_id, 'Lago'),
    (amares_id, 'Rendufe'),
    (amares_id, 'Santa Maria do Bouro'),
    (amares_id, 'Santo André do Bouro'),
    (amares_id, 'Torre e Portela'),
    (amares_id, 'Vilela, Seramil e Paredes Secas');

  -- Insert parishes for Barcelos (61)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (barcelos_id, 'Abade de Neiva'),
    (barcelos_id, 'Alheira e Igreja Nova'),
    (barcelos_id, 'Alvelos'),
    (barcelos_id, 'Arcozelo'),
    (barcelos_id, 'Areias de Vilar e Encourados'),
    (barcelos_id, 'Balugães'),
    (barcelos_id, 'Barcelinhos'),
    (barcelos_id, 'Barcelos, Vila Boa e Vila Frescainha (São Martinho e São Pedro)'),
    (barcelos_id, 'Barqueiros'),
    (barcelos_id, 'Carapeços'),
    (barcelos_id, 'Carvalhal'),
    (barcelos_id, 'Carvalhas'),
    (barcelos_id, 'Chorente, Góios, Courel, Pedra Furada e Gueral'),
    (barcelos_id, 'Creixomil e Mariz'),
    (barcelos_id, 'Cunha'),
    (barcelos_id, 'Durrães e Tregosa'),
    (barcelos_id, 'Fornelos'),
    (barcelos_id, 'Fragoso'),
    (barcelos_id, 'Galegos (Santa Maria)'),
    (barcelos_id, 'Galegos (São Martinho)'),
    (barcelos_id, 'Gamil e Midões'),
    (barcelos_id, 'Gilmonde'),
    (barcelos_id, 'Lama'),
    (barcelos_id, 'Lijó'),
    (barcelos_id, 'Macieira de Rates'),
    (barcelos_id, 'Manhente'),
    (barcelos_id, 'Martim'),
    (barcelos_id, 'Milhazes, Vilar de Figos e Faria'),
    (barcelos_id, 'Minhotães'),
    (barcelos_id, 'Monte de Fralães'),
    (barcelos_id, 'Negreiros e Chavão'),
    (barcelos_id, 'Oliveira'),
    (barcelos_id, 'Palme'),
    (barcelos_id, 'Panque'),
    (barcelos_id, 'Paradela'),
    (barcelos_id, 'Pereira'),
    (barcelos_id, 'Perelhal'),
    (barcelos_id, 'Pousa'),
    (barcelos_id, 'Remelhe'),
    (barcelos_id, 'Roriz'),
    (barcelos_id, 'Sequeade e Bastuço (São João e Santo Estevão)'),
    (barcelos_id, 'Silveiros e Rio Covo (Santa Eugénia)'),
    (barcelos_id, 'Silva'),
    (barcelos_id, 'Tamel (Santa Leocádia) e Vilar do Monte'),
    (barcelos_id, 'Tamel (São Veríssimo)'),
    (barcelos_id, 'Ucha'),
    (barcelos_id, 'Vila Cova e Feitos'),
    (barcelos_id, 'Vila Seca');

  -- Insert parishes for Braga (37)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (braga_id, 'Adaúfe'),
    (braga_id, 'Arentim e Cunha'),
    (braga_id, 'Braga (Maximinos, Sé e Cividade)'),
    (braga_id, 'Braga (São José de São Lázaro e São João do Souto)'),
    (braga_id, 'Braga (São Vicente)'),
    (braga_id, 'Braga (São Vítor)'),
    (braga_id, 'Celeirós, Aveleda e Vimieiro'),
    (braga_id, 'Crespos e Pousada'),
    (braga_id, 'Escudeiros e Penso (Santo Estêvão e São Vicente)'),
    (braga_id, 'Espinho'),
    (braga_id, 'Ferreiros e Gondizalves'),
    (braga_id, 'Figueiredo'),
    (braga_id, 'Gualtar'),
    (braga_id, 'Lamas'),
    (braga_id, 'Lomar e Arcos'),
    (braga_id, 'Merelim (São Paio), Panoias e Parada de Tibães'),
    (braga_id, 'Merelim (São Pedro) e Frossos'),
    (braga_id, 'Mire de Tibães'),
    (braga_id, 'Nogueira, Fraião e Lamaçães'),
    (braga_id, 'Nogueiró e Tenões'),
    (braga_id, 'Palmeira'),
    (braga_id, 'Pedralva'),
    (braga_id, 'Real, Dume e Semelhe'),
    (braga_id, 'Ruilhe'),
    (braga_id, 'Santa Lucrécia de Algeriz e Navarra'),
    (braga_id, 'São Pedro de Este'),
    (braga_id, 'São Pedro de Merelim'),
    (braga_id, 'Sequeira'),
    (braga_id, 'Sobreposta'),
    (braga_id, 'Tadim'),
    (braga_id, 'Tebosa'),
    (braga_id, 'Vilaça e Fradelos');

  -- Insert parishes for Cabeceiras de Basto (12)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (cabeceiras_basto_id, 'Abadim'),
    (cabeceiras_basto_id, 'Alvite e Passos'),
    (cabeceiras_basto_id, 'Arco de Baúlhe e Vila Nune'),
    (cabeceiras_basto_id, 'Basto'),
    (cabeceiras_basto_id, 'Bucos'),
    (cabeceiras_basto_id, 'Cabeceiras de Basto'),
    (cabeceiras_basto_id, 'Cavez'),
    (cabeceiras_basto_id, 'Faia'),
    (cabeceiras_basto_id, 'Gondiães e Vilar de Cunhas'),
    (cabeceiras_basto_id, 'Pedraça'),
    (cabeceiras_basto_id, 'Refojos de Basto, Outeiro e Painzela'),
    (cabeceiras_basto_id, 'Rio Douro');

  -- Insert parishes for Celorico de Basto (15)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (celorico_basto_id, 'Agilde'),
    (celorico_basto_id, 'Arnóia'),
    (celorico_basto_id, 'Borba de Montanha'),
    (celorico_basto_id, 'Britelo, Gémeos e Ourilhe'),
    (celorico_basto_id, 'Caçarilhe e Infesta'),
    (celorico_basto_id, 'Canedo de Basto e Corgo'),
    (celorico_basto_id, 'Carvalho e Basto (Santa Tecla)'),
    (celorico_basto_id, 'Codeçoso'),
    (celorico_basto_id, 'Fervença'),
    (celorico_basto_id, 'Moreira do Castelo'),
    (celorico_basto_id, 'Rego'),
    (celorico_basto_id, 'Ribas'),
    (celorico_basto_id, 'Vale de Bouro'),
    (celorico_basto_id, 'Veade, Gagos e Molares');

  -- Insert parishes for Esposende (9)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (esposende_id, 'Apúlia e Fão'),
    (esposende_id, 'Antas'),
    (esposende_id, 'Belinho e Mar'),
    (esposende_id, 'Curvos'),
    (esposende_id, 'Esposende, Marinhas e Gandra'),
    (esposende_id, 'Fonte Boa e Rio Tinto'),
    (esposende_id, 'Forjães'),
    (esposende_id, 'Gemeses'),
    (esposende_id, 'Vila Chã');

  -- Insert parishes for Fafe (25)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (fafe_id, 'Agrela e Serafão'),
    (fafe_id, 'Antime e Silvares (São Clemente)'),
    (fafe_id, 'Ardegão, Arnozela e Seidões'),
    (fafe_id, 'Armil'),
    (fafe_id, 'Cepães e Fareja'),
    (fafe_id, 'Estorãos'),
    (fafe_id, 'Fafe'),
    (fafe_id, 'Fornelos'),
    (fafe_id, 'Freitas e Vila Cova'),
    (fafe_id, 'Golães'),
    (fafe_id, 'Medelo'),
    (fafe_id, 'Monte e Queimadela'),
    (fafe_id, 'Moreira do Rei e Várzea Cova'),
    (fafe_id, 'Passos'),
    (fafe_id, 'Quinchães'),
    (fafe_id, 'Regadas'),
    (fafe_id, 'Revelhe'),
    (fafe_id, 'Ribeiros'),
    (fafe_id, 'São Gens'),
    (fafe_id, 'São Martinho de Silvares'),
    (fafe_id, 'Travassós'),
    (fafe_id, 'Vinhós');

  -- Insert parishes for Guimarães (48)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (guimaraes_id, 'Abação e Gémeos'),
    (guimaraes_id, 'Airão Santa Maria, Airão São João e Vermil'),
    (guimaraes_id, 'Aldão'),
    (guimaraes_id, 'Azurém'),
    (guimaraes_id, 'Barco'),
    (guimaraes_id, 'Brito'),
    (guimaraes_id, 'Caldelas'),
    (guimaraes_id, 'Candoso (São Martinho)'),
    (guimaraes_id, 'Candoso (São Tiago) e Mascotelos'),
    (guimaraes_id, 'Conde e Gandarela'),
    (guimaraes_id, 'Costa'),
    (guimaraes_id, 'Creixomil'),
    (guimaraes_id, 'Donim'),
    (guimaraes_id, 'Fermentões'),
    (guimaraes_id, 'Gonça'),
    (guimaraes_id, 'Gondar'),
    (guimaraes_id, 'Guardizela'),
    (guimaraes_id, 'Infantas'),
    (guimaraes_id, 'Leitões, Oleiros e Figueiredo'),
    (guimaraes_id, 'Longos'),
    (guimaraes_id, 'Lordelo'),
    (guimaraes_id, 'Mesão Frio'),
    (guimaraes_id, 'Moreira de Cónegos'),
    (guimaraes_id, 'Nespereira'),
    (guimaraes_id, 'Oliveira, São Paio e São Sebastião'),
    (guimaraes_id, 'Pencelo'),
    (guimaraes_id, 'Pinheiro'),
    (guimaraes_id, 'Polvoreira'),
    (guimaraes_id, 'Ponte'),
    (guimaraes_id, 'Ronfe'),
    (guimaraes_id, 'Prazins (Santa Eufémia)'),
    (guimaraes_id, 'Prazins (Santo Tirso) e Corvite'),
    (guimaraes_id, 'Rendufe'),
    (guimaraes_id, 'Ronfe'),
    (guimaraes_id, 'Sande (São Martinho)'),
    (guimaraes_id, 'Sande (São Lourenço e Balazar)'),
    (guimaraes_id, 'Sande (Vila Nova e São Clemente)'),
    (guimaraes_id, 'São Torcato'),
    (guimaraes_id, 'Selho (São Cristóvão)'),
    (guimaraes_id, 'Selho (São Jorge)'),
    (guimaraes_id, 'Selho (São Lourenço e Gominhães)'),
    (guimaraes_id, 'Serzedelo'),
    (guimaraes_id, 'Silvares'),
    (guimaraes_id, 'Souto Santa Maria, Souto São Salvador e Gondomar'),
    (guimaraes_id, 'Urgezes');

  -- Insert parishes for Póvoa de Lanhoso (22)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (povoa_lanhoso_id, 'Águas Santas e Moure'),
    (povoa_lanhoso_id, 'Ajude e Serzedelo'),
    (povoa_lanhoso_id, 'Barbosa'),
    (povoa_lanhoso_id, 'Campos e Louredo'),
    (povoa_lanhoso_id, 'Covelas'),
    (povoa_lanhoso_id, 'Esperança e Brunhais'),
    (povoa_lanhoso_id, 'Ferreiros'),
    (povoa_lanhoso_id, 'Fonte Arcada e Oliveira'),
    (povoa_lanhoso_id, 'Galegos'),
    (povoa_lanhoso_id, 'Geraz do Minho'),
    (povoa_lanhoso_id, 'Lanhoso'),
    (povoa_lanhoso_id, 'Monsul'),
    (povoa_lanhoso_id, 'Póvoa de Lanhoso (Nossa Senhora do Amparo)'),
    (povoa_lanhoso_id, 'Rendufinho'),
    (povoa_lanhoso_id, 'Santo Emilião'),
    (povoa_lanhoso_id, 'São João de Rei'),
    (povoa_lanhoso_id, 'Serzedelo e Calvos'),
    (povoa_lanhoso_id, 'Sobradelo da Goma'),
    (povoa_lanhoso_id, 'Taíde'),
    (povoa_lanhoso_id, 'Travassos'),
    (povoa_lanhoso_id, 'Verim, Friande e Ajude');

  -- Insert parishes for Terras de Bouro (14)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (terras_bouro_id, 'Balança'),
    (terras_bouro_id, 'Campo do Gerês'),
    (terras_bouro_id, 'Carvalheira'),
    (terras_bouro_id, 'Chamoim e Vilar'),
    (terras_bouro_id, 'Covide'),
    (terras_bouro_id, 'Gondoriz'),
    (terras_bouro_id, 'Moimenta'),
    (terras_bouro_id, 'Ribeira'),
    (terras_bouro_id, 'Rio Caldo'),
    (terras_bouro_id, 'Souto'),
    (terras_bouro_id, 'Valdosende'),
    (terras_bouro_id, 'Vilar da Veiga');

  -- Insert parishes for Vieira do Minho (16)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (vieira_minho_id, 'Anissó e Soutelo'),
    (vieira_minho_id, 'Anjos e Vilar do Chão'),
    (vieira_minho_id, 'Cantelães'),
    (vieira_minho_id, 'Caniçada e Soengas'),
    (vieira_minho_id, 'Eira Vedra'),
    (vieira_minho_id, 'Guilhofrei'),
    (vieira_minho_id, 'Louredo'),
    (vieira_minho_id, 'Mosteiro'),
    (vieira_minho_id, 'Parada do Bouro'),
    (vieira_minho_id, 'Pinheiro'),
    (vieira_minho_id, 'Rossas'),
    (vieira_minho_id, 'Salamonde'),
    (vieira_minho_id, 'Tabuaças'),
    (vieira_minho_id, 'Ventosa e Cova'),
    (vieira_minho_id, 'Vieira do Minho');

  -- Insert parishes for Vila Nova de Famalicão (49)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (vila_nova_famalicao_id, 'Antas e Abade de Vermoim'),
    (vila_nova_famalicao_id, 'Arnoso (Santa Maria e Santa Eulália) e Sezures'),
    (vila_nova_famalicao_id, 'Arnoso (São Mamede)'),
    (vila_nova_famalicao_id, 'Avidos e Lagoa'),
    (vila_nova_famalicao_id, 'Bairro'),
    (vila_nova_famalicao_id, 'Brufe'),
    (vila_nova_famalicao_id, 'Calendário'),
    (vila_nova_famalicao_id, 'Carreira e Bente'),
    (vila_nova_famalicao_id, 'Castelões'),
    (vila_nova_famalicao_id, 'Cavalões'),
    (vila_nova_famalicao_id, 'Cruz'),
    (vila_nova_famalicao_id, 'Delães'),
    (vila_nova_famalicao_id, 'Esmeriz e Cabeçudos'),
    (vila_nova_famalicao_id, 'Fradelos'),
    (vila_nova_famalicao_id, 'Gavião'),
    (vila_nova_famalicao_id, 'Gondifelos, Cavalões e Outiz'),
    (vila_nova_famalicao_id, 'Joane'),
    (vila_nova_famalicao_id, 'Landim'),
    (vila_nova_famalicao_id, 'Lemenhe, Mouquim e Jesufrei'),
    (vila_nova_famalicao_id, 'Louro'),
    (vila_nova_famalicao_id, 'Mogege'),
    (vila_nova_famalicao_id, 'Nine'),
    (vila_nova_famalicao_id, 'Oliveira (Santa Maria)'),
    (vila_nova_famalicao_id, 'Oliveira (São Mateus)'),
    (vila_nova_famalicao_id, 'Pedome'),
    (vila_nova_famalicao_id, 'Pousada de Saramagos'),
    (vila_nova_famalicao_id, 'Requião'),
    (vila_nova_famalicao_id, 'Ribeirão'),
    (vila_nova_famalicao_id, 'Riba de Ave'),
    (vila_nova_famalicao_id, 'Ruivães e Novais'),
    (vila_nova_famalicao_id, 'Seide'),
    (vila_nova_famalicao_id, 'Vermoim'),
    (vila_nova_famalicao_id, 'Vilarinho das Cambas'),
    (vila_nova_famalicao_id, 'Vila Nova de Famalicão (São Miguel)'),
    (vila_nova_famalicao_id, 'Vila Nova de Famalicão (Santa Maria Maior)'),
    (vila_nova_famalicao_id, 'Vila Nova de Famalicão (Antas)'),
    (vila_nova_famalicao_id, 'Outiz');

  -- Insert parishes for Vila Verde (33)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (vila_verde_id, 'Atiães'),
    (vila_verde_id, 'Barbudo'),
    (vila_verde_id, 'Cervães'),
    (vila_verde_id, 'Coucieiro'),
    (vila_verde_id, 'Dossãos'),
    (vila_verde_id, 'Escariz (São Mamede)'),
    (vila_verde_id, 'Esqueiros, Nevogilde e Travassós'),
    (vila_verde_id, 'Freiriz'),
    (vila_verde_id, 'Gême'),
    (vila_verde_id, 'Lage'),
    (vila_verde_id, 'Lanhas'),
    (vila_verde_id, 'Loureira'),
    (vila_verde_id, 'Marrancos e Arcozelo'),
    (vila_verde_id, 'Moure'),
    (vila_verde_id, 'Oleiros'),
    (vila_verde_id, 'Oriz (Santa Marinha) e Oriz (São Miguel)'),
    (vila_verde_id, 'Parada de Gatim'),
    (vila_verde_id, 'Pico de Regalados, Gondiães e Mós'),
    (vila_verde_id, 'Prado (São Miguel)'),
    (vila_verde_id, 'Prado (São João)'),
    (vila_verde_id, 'Sabariz'),
    (vila_verde_id, 'Soutelo'),
    (vila_verde_id, 'Turiz'),
    (vila_verde_id, 'Valdreu'),
    (vila_verde_id, 'Valbom (São Pedro), Passô e Valbom (São Martinho)'),
    (vila_verde_id, 'Vila de Prado'),
    (vila_verde_id, 'Vila Verde e Barbudo');

  -- Insert parishes for Vizela (5)
  INSERT INTO freguesias (concelho_id, nome) VALUES 
    (vizela_id, 'Caldas de Vizela (São Miguel e São João)'),
    (vizela_id, 'Infias'),
    (vizela_id, 'Santa Eulália'),
    (vizela_id, 'Tagilde e Vizela (São Paio)');

END $$;