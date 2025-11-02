import { useState, useCallback } from 'react';
import { supabaseDb } from '@/lib/supabase-types';
import { useAuth } from './useAuth';

export const useLabCompletion = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // This function now gets completed TASK IDs
  const getCompletedTasks = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabaseDb
        .from('lab_task_completions')
        .select('task_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map((item: any) => item.task_id);
    } catch (error) {
      console.error('Error fetching completed tasks:', error);
      return [];
    }
  }, [user]);

  // This function now completes a TASK
  const completeTask = useCallback(async (task_id: number) => {
    if (!user) return { success: false, alreadyCompleted: false };

    setLoading(true);

    try {
      // Check if already completed
      const { data: existing, error: checkError } = await supabaseDb
        .from('lab_task_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('task_id', task_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = 'No rows found', which is good
        throw checkError;
      }

      if (existing) {
        return { success: true, alreadyCompleted: true };
      }

      // Insert new completion
      const { error: insertError } = await supabaseDb
        .from('lab_task_completions')
        .insert({
          user_id: user.id,
          task_id: task_id,
        });

      if (insertError) throw insertError;

      return { success: true, alreadyCompleted: false };
    } catch (error) {
      console.error('Error completing task:', error);
      return { success: false, alreadyCompleted: false };
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    getCompletedTasks, // Renamed function
    completeTask,     // Renamed function
  };
};

// NOTE: You may need to update imports in other files
// from 'useLabCompletion' if you rename the file.
// For simplicity, I have kept the filename the same.