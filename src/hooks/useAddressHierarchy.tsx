import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

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
  
  // Search states
  const [districtSearch, setDistrictSearch] = useState('');
  const [municipalitySearch, setMunicipalitySearch] = useState('');
  const [parishSearch, setParishSearch] = useState('');
  
  // Filtered data
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<Municipality[]>([]);
  const [filteredParishes, setFilteredParishes] = useState<Parish[]>([]);
  
  // CSV URL from settings
  const [csvUrl, setCsvUrl] = useState<string>('');

  // Load CSV URL from settings
  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'ruas_csv_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setCsvUrl(data.value);
        }
      });
  }, []);
  
  // Load districts on mount
  useEffect(() => {
    supabase
      .from('distritos')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => {
        setDistricts(data || []);
        setFilteredDistricts(data || []);
      });
  }, []);

  // Filter districts based on search
  useEffect(() => {
    if (districtSearch) {
      setFilteredDistricts(
        districts.filter(d => 
          d.nome.toLowerCase().includes(districtSearch.toLowerCase())
        )
      );
    } else {
      setFilteredDistricts(districts);
    }
  }, [districts, districtSearch]);

  // Load municipalities when district changes
  useEffect(() => {
    if (selectedDistrict) {
      supabase
        .from('concelhos')
        .select('id, nome, distrito_id')
        .eq('distrito_id', selectedDistrict)
        .order('nome')
        .then(({ data }) => {
          setMunicipalities(data || []);
          setFilteredMunicipalities(data || []);
        });
    } else {
      setMunicipalities([]);
      setFilteredMunicipalities([]);
    }
    setSelectedMunicipality('');
    setMunicipalitySearch('');
  }, [selectedDistrict]);

  // Filter municipalities based on search
  useEffect(() => {
    if (municipalitySearch) {
      setFilteredMunicipalities(
        municipalities.filter(m => 
          m.nome.toLowerCase().includes(municipalitySearch.toLowerCase())
        )
      );
    } else {
      setFilteredMunicipalities(municipalities);
    }
  }, [municipalities, municipalitySearch]);

  // Load parishes when municipality changes
  useEffect(() => {
    if (selectedMunicipality) {
      supabase
        .from('freguesias')
        .select('id, nome, concelho_id')
        .eq('concelho_id', selectedMunicipality)
        .order('nome')
        .then(({ data }) => {
          setParishes(data || []);
          setFilteredParishes(data || []);
        });
    } else {
      setParishes([]);
      setFilteredParishes([]);
    }
    setSelectedParish('');
    setParishSearch('');
  }, [selectedMunicipality]);

  // Filter parishes based on search
  useEffect(() => {
    if (parishSearch) {
      setFilteredParishes(
        parishes.filter(p => 
          p.nome.toLowerCase().includes(parishSearch.toLowerCase())
        )
      );
    } else {
      setFilteredParishes(parishes);
    }
  }, [parishes, parishSearch]);

  // Helper function to convert Google Drive share link to download link
  const getGoogleDriveDownloadUrl = (url: string): string => {
    const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    }
    return url;
  };

  // Load streets when parish changes or search term updates
  useEffect(() => {
    if (!selectedParish) {
      setStreets([]);
      return;
    }

    // If CSV URL is configured, fetch from CSV
    if (csvUrl) {
      const downloadUrl = getGoogleDriveDownloadUrl(csvUrl);
      
      fetch(downloadUrl)
        .then(response => response.text())
        .then(csvText => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const allStreets = results.data as Array<{ freguesia_id: string; nome: string; id?: string }>;
              
              // Filter by parish and search term
              let filtered = allStreets.filter(s => s.freguesia_id === selectedParish);
              
              if (streetSearch) {
                filtered = filtered.filter(s => 
                  s.nome?.toLowerCase().includes(streetSearch.toLowerCase())
                );
              }
              
              // Generate IDs if not present
              const streetsWithIds = filtered.map((s, idx) => ({
                id: s.id || `csv-${idx}`,
                nome: s.nome || '',
                freguesia_id: s.freguesia_id
              }));
              
              setStreets(streetsWithIds);
            },
            error: (error) => {
              console.error('Error parsing CSV:', error);
              // Fallback to database
              loadStreetsFromDatabase();
            }
          });
        })
        .catch(error => {
          console.error('Error fetching CSV:', error);
          // Fallback to database
          loadStreetsFromDatabase();
        });
    } else {
      // Use database
      loadStreetsFromDatabase();
    }

    function loadStreetsFromDatabase() {
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
    }
  }, [selectedParish, streetSearch, csvUrl]);

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
    districts: filteredDistricts,
    municipalities: filteredMunicipalities,
    parishes: filteredParishes,
    streets,
    selectedDistrict,
    selectedMunicipality,
    selectedParish,
    streetSearch,
    districtSearch,
    municipalitySearch,
    parishSearch,
    setSelectedDistrict,
    setSelectedMunicipality,
    setSelectedParish,
    setStreetSearch,
    setDistrictSearch,
    setMunicipalitySearch,
    setParishSearch,
    getSelectedNames
  };
};