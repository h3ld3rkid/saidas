import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface District {
  id: string;
  nome: string;
}

interface Municipality {
  id: string;
  nome: string;
  distrito_id: string;
}

interface Parish {
  id: string;
  nome: string;
  concelho_id: string;
}

interface Street {
  id: string;
  nome: string;
  freguesia_id: string;
}

export const useAddressHierarchy = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [streets, setStreets] = useState<Street[]>([]);
  
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [selectedParish, setSelectedParish] = useState('');
  const [streetSearch, setStreetSearch] = useState('');
  
  // Load districts on mount
  useEffect(() => {
    supabase
      .from('distritos')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setDistricts(data || []));
  }, []);

  // Load municipalities when district changes
  useEffect(() => {
    if (selectedDistrict) {
      supabase
        .from('concelhos')
        .select('id, nome, distrito_id')
        .eq('distrito_id', selectedDistrict)
        .order('nome')
        .then(({ data }) => setMunicipalities(data || []));
    } else {
      setMunicipalities([]);
    }
    setSelectedMunicipality('');
  }, [selectedDistrict]);

  // Load parishes when municipality changes
  useEffect(() => {
    if (selectedMunicipality) {
      supabase
        .from('freguesias')
        .select('id, nome, concelho_id')
        .eq('concelho_id', selectedMunicipality)
        .order('nome')
        .then(({ data }) => setParishes(data || []));
    } else {
      setParishes([]);
    }
    setSelectedParish('');
  }, [selectedMunicipality]);

  // Load streets when parish changes or search term updates
  useEffect(() => {
    if (selectedParish) {
      let query = supabase
        .from('ruas')
        .select('id, nome, freguesia_id')
        .eq('freguesia_id', selectedParish);
      
      if (streetSearch) {
        query = query.ilike('nome', `%${streetSearch}%`);
      }
      
      query
        .order('nome')
        .then(({ data }) => setStreets(data || []));
    } else {
      setStreets([]);
    }
  }, [selectedParish, streetSearch]);

  const getSelectedNames = () => {
    const districtName = districts.find(d => d.id === selectedDistrict)?.nome || '';
    const municipalityName = municipalities.find(m => m.id === selectedMunicipality)?.nome || '';
    const parishName = parishes.find(p => p.id === selectedParish)?.nome || '';
    
    return {
      district: districtName,
      municipality: municipalityName,
      parish: parishName
    };
  };

  return {
    districts,
    municipalities,
    parishes,
    streets,
    selectedDistrict,
    selectedMunicipality,
    selectedParish,
    streetSearch,
    setSelectedDistrict,
    setSelectedMunicipality,
    setSelectedParish,
    setStreetSearch,
    getSelectedNames
  };
};