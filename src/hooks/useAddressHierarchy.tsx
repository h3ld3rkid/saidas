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
  const [allMunicipalities, setAllMunicipalities] = useState<Municipality[]>([]);
  const [allParishes, setAllParishes] = useState<Parish[]>([]);
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
  
  // Refresh counter to force reload
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // CSV URLs from settings
  const [csvUrl, setCsvUrl] = useState<string>('');
  const [distritosCsvUrl, setDistritosCsvUrl] = useState<string>('');
  const [concelhosCsvUrl, setConcelhosCsvUrl] = useState<string>('');
  const [freguesiasCsvUrl, setFreguesiasCsvUrl] = useState<string>('');

  // Load CSV URLs from settings
  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['ruas_csv_url', 'distritos_csv_url', 'concelhos_csv_url', 'freguesias_csv_url'])
      .then(({ data }) => {
        data?.forEach(setting => {
          if (setting.key === 'ruas_csv_url') setCsvUrl(setting.value || '');
          if (setting.key === 'distritos_csv_url') setDistritosCsvUrl(setting.value || '');
          if (setting.key === 'concelhos_csv_url') setConcelhosCsvUrl(setting.value || '');
          if (setting.key === 'freguesias_csv_url') setFreguesiasCsvUrl(setting.value || '');
        });
      });
  }, [refreshCounter]);
  
  // Load districts on mount (from CSV or database)
  useEffect(() => {
    if (distritosCsvUrl) {
      const cacheBuster = `?t=${Date.now()}`;
      const urlWithCacheBuster = distritosCsvUrl.includes('?') 
        ? `${distritosCsvUrl}&_cb=${Date.now()}` 
        : `${distritosCsvUrl}${cacheBuster}`;
      
      fetch(urlWithCacheBuster)
        .then(response => response.text())
        .then(csvText => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => {
              const data = (results.data as Array<{ id: string; nome: string }>)
                .map(d => ({ id: d.id?.trim(), nome: d.nome?.trim() }))
                .filter(d => d.id && d.nome)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
              setDistricts(data);
              setFilteredDistricts(data);
            }
          });
        })
        .catch(() => loadDistrictsFromDatabase());
    } else {
      loadDistrictsFromDatabase();
    }

    function loadDistrictsFromDatabase() {
      supabase
        .from('distritos')
        .select('id, nome')
        .order('nome')
        .then(({ data }) => {
          setDistricts(data || []);
          setFilteredDistricts(data || []);
        });
    }
  }, [distritosCsvUrl, refreshCounter]);

  // Load all municipalities (from CSV or database)
  useEffect(() => {
    if (concelhosCsvUrl) {
      const cacheBuster = `?t=${Date.now()}`;
      const urlWithCacheBuster = concelhosCsvUrl.includes('?') 
        ? `${concelhosCsvUrl}&_cb=${Date.now()}` 
        : `${concelhosCsvUrl}${cacheBuster}`;
      
      fetch(urlWithCacheBuster)
        .then(response => response.text())
        .then(csvText => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => {
              const data = (results.data as Array<{ id: string; nome: string; distrito_id: string }>)
                .map(m => ({ id: m.id?.trim(), nome: m.nome?.trim(), distrito_id: m.distrito_id?.trim() }))
                .filter(m => m.id && m.nome && m.distrito_id)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
              setAllMunicipalities(data);
            }
          });
        })
        .catch(() => loadMunicipalitiesFromDatabase());
    } else {
      loadMunicipalitiesFromDatabase();
    }

    function loadMunicipalitiesFromDatabase() {
      supabase
        .from('concelhos')
        .select('id, nome, distrito_id')
        .order('nome')
        .then(({ data }) => {
          setAllMunicipalities(data || []);
        });
    }
  }, [concelhosCsvUrl, refreshCounter]);

  // Load all parishes (from CSV or database)
  useEffect(() => {
    console.log('Loading parishes, CSV URL:', freguesiasCsvUrl ? 'SET' : 'EMPTY');
    
    if (freguesiasCsvUrl) {
      // Add cache-buster to avoid browser/CDN caching
      const cacheBuster = `?t=${Date.now()}`;
      const urlWithCacheBuster = freguesiasCsvUrl.includes('?') 
        ? `${freguesiasCsvUrl}&_cb=${Date.now()}` 
        : `${freguesiasCsvUrl}${cacheBuster}`;
      
      fetch(urlWithCacheBuster)
        .then(response => response.text())
        .then(csvText => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            complete: (results) => {
              const data = (results.data as Array<{ id: string; nome: string; concelho_id: string }>)
                .map(p => ({ id: p.id?.trim(), nome: p.nome?.trim(), concelho_id: p.concelho_id?.trim() }))
                .filter(p => p.id && p.nome && p.concelho_id)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
              setAllParishes(data);
              console.log('✅ Loaded parishes from CSV:', data.length);
              // Debug: check for Vila Verde parishes
              const vilaVerdeParishes = data.filter(p => p.concelho_id === '34790014-b808-4c18-89d1-e80fdb06d863');
              console.log('Vila Verde parishes from CSV:', vilaVerdeParishes.length);
            }
          });
        })
        .catch((err) => {
          console.error('CSV fetch error:', err);
          loadParishesFromDatabase();
        });
    } else {
      loadParishesFromDatabase();
    }

    function loadParishesFromDatabase() {
      console.log('⚠️ Loading parishes from DATABASE (no CSV URL)');
      supabase
        .from('freguesias')
        .select('id, nome, concelho_id')
        .order('nome')
        .then(({ data }) => {
          setAllParishes(data || []);
          console.log('Loaded parishes from DB:', data?.length);
        });
    }
  }, [freguesiasCsvUrl, refreshCounter]);

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

  // Filter municipalities when district changes
  useEffect(() => {
    if (selectedDistrict) {
      const filtered = allMunicipalities.filter(m => m.distrito_id === selectedDistrict);
      setMunicipalities(filtered);
      setFilteredMunicipalities(filtered);
    } else {
      setMunicipalities([]);
      setFilteredMunicipalities([]);
    }
    setSelectedMunicipality('');
    setMunicipalitySearch('');
  }, [selectedDistrict, allMunicipalities]);

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

  // Filter parishes when municipality changes
  useEffect(() => {
    console.log('Municipality changed to:', selectedMunicipality);
    console.log('All parishes count:', allParishes.length);
    if (selectedMunicipality) {
      const filtered = allParishes.filter(p => p.concelho_id === selectedMunicipality);
      console.log('Filtered parishes for municipality:', filtered.length, filtered.map(p => p.nome));
      setParishes(filtered);
      setFilteredParishes(filtered);
    } else {
      setParishes([]);
      setFilteredParishes([]);
    }
    setSelectedParish('');
    setParishSearch('');
  }, [selectedMunicipality, allParishes]);

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
            transformHeader: (header) => header.trim(),
            complete: (results) => {
              const allStreets = results.data as Array<{ freguesia_id: string; nome: string; id?: string }>;
              
              // Filter by parish and search term (trim values to handle spaces in CSV)
              let filtered = allStreets.filter(s => s.freguesia_id?.trim() === selectedParish);
              
              if (streetSearch) {
                filtered = filtered.filter(s => 
                  s.nome?.toLowerCase().includes(streetSearch.toLowerCase())
                );
              }
              
              // Generate IDs if not present and trim values
              const streetsWithIds = filtered.map((s, idx) => ({
                id: s.id?.trim() || `csv-${idx}`,
                nome: s.nome?.trim() || '',
                freguesia_id: s.freguesia_id?.trim()
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

  // Manual refresh function
  const refreshAddressData = () => {
    setRefreshCounter(prev => prev + 1);
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
    getSelectedNames,
    refreshAddressData
  };
};