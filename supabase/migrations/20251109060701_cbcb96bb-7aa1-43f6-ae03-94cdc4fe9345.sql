-- Create triggers for automatic user stats updates

-- Trigger for quiz completions
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_quiz ON public.quiz_completions;
CREATE TRIGGER trigger_update_user_stats_on_quiz
  AFTER INSERT OR UPDATE ON public.quiz_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats_on_quiz_completion();

-- Trigger for lab completions  
DROP TRIGGER IF EXISTS trigger_update_user_stats_on_lab ON public.lab_completions;
CREATE TRIGGER trigger_update_user_stats_on_lab
  AFTER INSERT OR UPDATE ON public.lab_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats_on_lab();