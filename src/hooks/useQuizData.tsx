import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Quiz {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  xp_reward: number;
  jiet_reward: number;
  duration_minutes: number;
  question_count: number;
  is_locked: boolean;
  sort_order: number;
}

interface QuizQuestion {
  id: string;
  quiz_id: number;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  sort_order: number;
}

interface QuizCompletion {
  quiz_id: number;
  score: number;
  jiet_rewarded: boolean;
  completed_at: string;
}

export const useQuizData = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [completions, setCompletions] = useState<QuizCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadQuizData();
  }, [user]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .order('sort_order', { ascending: true });

      if (quizzesError) throw quizzesError;

      setQuizzes(quizzesData || []);

      if (user) {
        const { data: completionsData, error: completionsError } = await supabase
          .from('quiz_completions')
          .select('*')
          .eq('user_id', user.id);

        if (completionsError) throw completionsError;

        setCompletions(completionsData || []);
      }
    } catch (err) {
      console.error('Error loading quiz data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  const getQuizQuestions = async (quizId: number): Promise<QuizQuestion[]> => {
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error loading quiz questions:', err);
      throw err;
    }
  };

  const saveQuizCompletion = async (quizId: number, score: number) => {
    if (!user) {
      throw new Error('User must be authenticated to save quiz completion');
    }

    try {
      const { error } = await supabase
        .from('quiz_completions')
        .upsert(
          {
            user_id: user.id,
            quiz_id: quizId,
            score,
            completed_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,quiz_id',
            ignoreDuplicates: false
          }
        );

      if (error) throw error;

      await loadQuizData();
    } catch (err) {
      console.error('Error saving quiz completion:', err);
      throw err;
    }
  };

  const markRewardClaimed = async (quizId: number) => {
    if (!user) {
      throw new Error('User must be authenticated to claim reward');
    }

    try {
      const { error } = await supabase
        .from('quiz_completions')
        .update({ jiet_rewarded: true })
        .eq('user_id', user.id)
        .eq('quiz_id', quizId);

      if (error) throw error;

      await loadQuizData();
    } catch (err) {
      console.error('Error marking reward as claimed:', err);
      throw err;
    }
  };

  const getCompletion = (quizId: number): QuizCompletion | undefined => {
    return completions.find(c => c.quiz_id === quizId);
  };

  const isQuizCompleted = (quizId: number): boolean => {
    return completions.some(c => c.quiz_id === quizId);
  };

  const isRewardClaimed = (quizId: number): boolean => {
    const completion = getCompletion(quizId);
    return completion?.jiet_rewarded || false;
  };

  const getQuizScore = (quizId: number): number | undefined => {
    const completion = getCompletion(quizId);
    return completion?.score;
  };

  const getTotalXP = (): number => {
    return completions.reduce((total, completion) => {
      const quiz = quizzes.find(q => q.id === completion.quiz_id);
      if (!quiz) return total;
      const earnedXP = Math.round((completion.score / 100) * quiz.xp_reward);
      return total + earnedXP;
    }, 0);
  };

  const getAverageScore = (): number => {
    if (completions.length === 0) return 0;
    const totalScore = completions.reduce((sum, c) => sum + c.score, 0);
    return Math.round(totalScore / completions.length);
  };

  return {
    quizzes,
    completions,
    loading,
    error,
    getQuizQuestions,
    saveQuizCompletion,
    markRewardClaimed,
    getCompletion,
    isQuizCompleted,
    isRewardClaimed,
    getQuizScore,
    getTotalXP,
    getAverageScore,
    refresh: loadQuizData,
  };
};
