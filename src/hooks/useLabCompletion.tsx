import { useState, useCallback } from 'react';
import { supabaseDb } from '@/lib/supabase-types';
import { useAuth } from './useAuth';

export const useLabCompletion = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Gets completed TASK IDs
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

  // COMPLETES A TASK & AWARDS REWARDS (XP + JIET)
  const completeTask = useCallback(async (task_id: number) => {
    if (!user) return { success: false, alreadyCompleted: false };

    setLoading(true);

    try {
      // 1. Check if already completed to prevent double-dipping
      const { data: existing, error: checkError } = await supabaseDb
        .from('lab_task_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('task_id', task_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      if (existing) return { success: true, alreadyCompleted: true };

      // 2. Fetch Task Details (Lab ID for JIET, XP for stats)
      const { data: taskData, error: taskError } = await supabaseDb
          .from('lab_tasks')
          .select('lab_id, xp_reward')
          .eq('id', task_id)
          .single();
      
      if (taskError || !taskData) {
          throw new Error("Could not find task details for rewards.");
      }

      // 3. Mark task as physically completed
      const { error: insertTaskError } = await supabaseDb
        .from('lab_task_completions')
        .insert({
          user_id: user.id,
          task_id: task_id,
        });
      if (insertTaskError) throw insertTaskError;

      // 4. Record Pending JIET Reward (Fixes Bug #1)
      // This ensures they can claim it later if their wallet isn't connected now.
      await supabaseDb
        .from('lab_completions')
        .upsert({
            user_id: user.id,
            task_id: task_id,
            lab_id: taskData.lab_id,
            jiet_amount: 15,      // Standard Lab Reward
            jiet_rewarded: false  // Marked as pending
        }, { onConflict: 'user_id, task_id' });

      // 5. Award XP to User Stats (Fixes Bug #2)
      // We first fetch current stats, then increment.
      const { data: stats, error: statsError } = await supabaseDb
        .from('user_stats')
        .select('total_xp, labs_completed')
        .eq('user_id', user.id)
        .single();

      if (!statsError && stats) {
         await supabaseDb
            .from('user_stats')
            .update({ 
                total_xp: (stats.total_xp || 0) + (taskData.xp_reward || 0),
                labs_completed: (stats.labs_completed || 0) + 1
            })
            .eq('user_id', user.id);
      }

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
    getCompletedTasks,
    completeTask,
  };
};