import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'user' | 'mod' | 'admin';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_current_user_role');

        if (error) {
          console.error('Error fetching user role via RPC:', error);
          setRole('user');
        } else {
          const serverRole = (data as string) ?? 'user';
          const mapped = serverRole === 'moderator' ? 'mod' : serverRole;
          setRole((['user', 'mod', 'admin'].includes(mapped) ? mapped : 'user') as UserRole);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    const roleHierarchy = { admin: 3, mod: 2, user: 1 } as const;
    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  }, [role]);

  return { role, loading, hasRole };
};