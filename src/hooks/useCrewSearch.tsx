import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CrewMember {
  user_id: string;
  display_name: string;
}

export const useCrewSearch = () => {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchCrew = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('search_active_crew_profiles', {
          q: searchTerm
        });
        
        if (error) {
          console.error('Error searching crew:', error);
        } else {
          setCrewMembers(data || []);
        }
      } catch (error) {
        console.error('Error searching crew:', error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(searchCrew, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return {
    crewMembers,
    searchTerm,
    setSearchTerm,
    loading
  };
};