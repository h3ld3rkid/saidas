import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserName {
  id: string;
  name: string;
}

export const useUserNames = (userIds: string[] = []) => {
  const [userNames, setUserNames] = useState<UserName[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userIds.length === 0) {
      setUserNames([]);
      return;
    }

    const fetchUserNames = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (error) throw error;

        const names = data?.map(user => ({
          id: user.user_id,
          name: `${user.first_name} ${user.last_name}`.trim()
        })) || [];

        setUserNames(names);
      } catch (error) {
        console.error('Error fetching user names:', error);
        setUserNames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserNames();
  }, [userIds.join(',')]);

  const getUserName = (userId: string): string => {
    const user = userNames.find(u => u.id === userId);
    return user?.name || 'Utilizador não encontrado';
  };

  const formatCrewNames = (crewString: string): string => {
    if (!crewString) return 'N/A';
    
    const crewIds = crewString.split(',').map(id => id.trim()).filter(Boolean);
    const names = crewIds.map(id => getUserName(id));
    return names.join(', ');
  };

  return {
    userNames,
    loading,
    getUserName,
    formatCrewNames
  };
};