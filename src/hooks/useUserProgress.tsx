import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseDb } from '@/lib/supabase-types';
import { useAuth } from '@/hooks/useAuth';

// Simple types without Database reference
type QuizCompletion = { quiz_id: number; score: number; user_id: string };
type LabCompletion = { lab_id: number; user_id: string };
type UserStats = { total_xp: number; quizzes_completed: number; labs_completed: number; user_id: string };

export interface UserProgress {
  stats: UserStats | null;
  quizCompletions: Pick<QuizCompletion, 'quiz_id' | 'score'>[];
  labCompletions: Pick<LabCompletion, 'lab_id'>[];
  loading: boolean;
}

export const useUserProgress = (): UserProgress => {
  const { user } = useAuth(); // Get the current authenticated user
  const [stats, setStats] = useState<UserProgress['stats']>(null);
  const [quizCompletions, setQuizCompletions] = useState<UserProgress['quizCompletions']>([]);
  const [labCompletions, setLabCompletions] = useState<UserProgress['labCompletions']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch from user_stats table
        const { data: statsData, error: statsError } = await supabaseDb
          .from('user_stats')
          .select('total_xp, quizzes_completed, labs_completed, user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (statsError) throw statsError;
        // We cast to UserStats here, but only select a few fields
        setStats(statsData as UserStats | null);

        // Fetch from quiz_completions table
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_completions')
          .select('quiz_id, score')
          .eq('user_id', user.id);
        
        if (quizError) throw quizError;
        setQuizCompletions(quizData || []);

        // Fetch from lab_task_completions table
        const { data: labData, error: labError } = await supabaseDb
          .from('lab_task_completions')
          .select('task_id, user_id')
          .eq('user_id', user.id);

        if (labError) throw labError;
        setLabCompletions((labData || []).map(d => ({ lab_id: d.task_id, user_id: d.user_id })));

      } catch (error) {
        console.error('Error fetching user progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return { stats, quizCompletions, labCompletions, loading };
};