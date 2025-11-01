// src/hooks/useAdmin.tsx - IMPROVED VERSION
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminStatus {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

export const useAdmin = (): AdminStatus => {
  const { user } = useAuth();
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    isSuperAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        console.log('useAdmin: No user found');
        setAdminStatus({ isAdmin: false, isSuperAdmin: false, loading: false });
        return;
      }

      console.log('useAdmin: Checking admin status for user:', user.id);

      try {
        // Method 1: Check using database function (preferred)
        const { data: isAdminData, error: isAdminError } = await supabase
          .rpc('is_admin', { check_user_id: user.id });

        const { data: isSuperAdminData, error: isSuperAdminError } = await supabase
          .rpc('is_super_admin', { check_user_id: user.id });

        console.log('useAdmin: RPC results', {
          isAdminData,
          isAdminError,
          isSuperAdminData,
          isSuperAdminError
        });

        if (!isAdminError && !isSuperAdminError) {
          const status = {
            isAdmin: isAdminData || false,
            isSuperAdmin: isSuperAdminData || false,
            loading: false,
          };
          console.log('useAdmin: Setting status from RPC:', status);
          setAdminStatus(status);
          return;
        }

        console.log('useAdmin: RPC functions not available or failed, trying direct query');

        // Method 2: Direct query fallback
        const { data: adminRoleData, error: roleError } = await supabase
          .from('admin_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleError) {
          console.error('useAdmin: Error querying admin_roles:', roleError);
          
          // Method 3: Final fallback - check email against hardcoded list
          const adminEmails = [
            'mr.himanshu045@gmail.com', 
            'super@cryptiq.com',
            '139303804+Youvraj15@users.noreply.github.com',
            'himanshu.bhalan@gmail.com',
            'youvraj15@gmail.com',
            'himanshubhalan15@gmail.com',
            'bhalan.himanshu@gmail.com'
          ];
          
          const isAdminByEmail = adminEmails.includes(user.email || '');
          console.log('useAdmin: Fallback email check:', { email: user.email, isAdmin: isAdminByEmail });
          
          setAdminStatus({
            isAdmin: isAdminByEmail,
            isSuperAdmin: isAdminByEmail,
            loading: false,
          });
          return;
        }

        const status = {
          isAdmin: !!adminRoleData,
          isSuperAdmin: adminRoleData?.role === 'super_admin',
          loading: false,
        };
        console.log('useAdmin: Setting status from direct query:', status);
        setAdminStatus(status);

      } catch (error) {
        console.error('useAdmin: Unexpected error:', error);
        setAdminStatus({ isAdmin: false, isSuperAdmin: false, loading: false });
      }
    };

    checkAdminStatus();
  }, [user]);

  console.log('useAdmin: Current status:', adminStatus);
  return adminStatus;
};

// Helper function to log admin actions
export const logAdminAction = async (
  actionType: 'create' | 'update' | 'delete' | 'view',
  entityType: 'quiz' | 'user' | 'reward' | 'lab',
  entityId: string,
  details?: any
) => {
  try {
    const { data, error } = await supabase.rpc('log_admin_action', {
      p_action_type: actionType,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_details: details || null,
    });

    if (error) {
      console.error('Error logging admin action:', error);
      return { success: false, error };
    }

    return { success: true, actionId: data };
  } catch (error) {
    console.error('Error logging admin action:', error);
    return { success: false, error };
  }
};