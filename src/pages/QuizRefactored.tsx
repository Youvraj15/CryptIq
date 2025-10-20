import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Award, CheckCircle, Lock, TrendingUp, Target, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QuizModal } from '@/components/QuizModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuizData } from '@/hooks/useQuizData';

interface QuizQuestion {
  id: string;
  quiz_id: number;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  sort_order: number;
}

const Quiz = () => {
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [selectedQuizQuestions, setSelectedQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const { toast } = useToast();
  const { publicKey, connected } = useWallet();
  const { user } = useAuth();
  const {
    quizzes,
    loading,
    error,
    getQuizQuestions,
    saveQuizCompletion,
    markRewardClaimed,
    isRewardClaimed,
    getQuizScore,
    getTotalXP,
    getAverageScore,
  } = useQuizData();

  useEffect(() => {
    if (selectedQuiz !== null) {
      loadQuizQuestions(selectedQuiz);
    }
  }, [selectedQuiz]);

  const loadQuizQuestions = async (quizId: number) => {
    try {
      const questions = await getQuizQuestions(quizId);
      const formattedQuestions = questions.map((q: any) => ({
        id: q.id,
        question: q.question_text,
        options: q.options,
        correctAnswer: q.correct_answer_index,
        explanation: q.explanation,
      }));
      setSelectedQuizQuestions(formattedQuestions);
    } catch (err) {
      console.error('Failed to load quiz questions:', err);
      toast({
        title: 'Error',
        description: 'Failed to load quiz questions',
        variant: 'destructive',
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-500/20 text-green-400';
      case 'Intermediate':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Advanced':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleQuizComplete = async (quizId: number, score: number) => {
    try {
      await saveQuizCompletion(quizId, score);

      if (connected && publicKey && !isRewardClaimed(quizId) && score >= 70) {
        toast({
          title: 'Quiz Completed! 🎉',
          description: `You scored ${score}%. Click below to claim your JIET tokens!`,
          action: (
            <Button
              size="sm"
              onClick={() => handleClaimReward(quizId, score)}
              disabled={isClaimingReward}
            >
              {isClaimingReward ? 'Claiming...' : 'Claim Reward'}
            </Button>
          ),
        });
      } else if (score < 70) {
        toast({
          title: 'Quiz Completed',
          description: `You scored ${score}%. You need at least 70% to claim JIET rewards.`,
        });
      } else {
        toast({
          title: 'Quiz Completed!',
          description: `You scored ${score}%. ${!connected ? 'Connect your wallet to claim JIET rewards!' : ''}`,
        });
      }
    } catch (err) {
      console.error('Failed to save quiz completion:', err);
      toast({
        title: 'Error',
        description: 'Failed to save quiz completion',
        variant: 'destructive',
      });
    }
  };

  const handleClaimReward = async (quizId: number, score: number) => {
    if (!connected || !publicKey) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your Solana wallet to claim rewards.',
        variant: 'destructive',
      });
      return;
    }

    if (isRewardClaimed(quizId)) {
      toast({
        title: 'Already Claimed',
        description: 'You have already claimed rewards for this quiz.',
      });
      return;
    }

    if (score < 70) {
      toast({
        title: 'Score Too Low',
        description: 'You need at least 70% to claim JIET rewards.',
        variant: 'destructive',
      });
      return;
    }

    setIsClaimingReward(true);

    try {
      const { data, error } = await supabase.functions.invoke('transfer-jiet-reward', {
        body: {
          quizId,
          score,
          walletAddress: publicKey.toString(),
        },
      });

      if (error) throw error;

      if (data && (data as any).success) {
        await markRewardClaimed(quizId);

        toast({
          title: 'Reward Claimed! 🎉',
          description: (data as any).message || 'JIET tokens were sent to your wallet.',
        });
      } else if (data && (data as any).alreadyRewarded) {
        toast({
          title: 'Already Claimed',
          description: (data as any).message || 'This quiz reward was already claimed.',
        });
      } else if (data && (data as any).scoreRequired) {
        toast({
          title: 'Score Too Low',
          description: (data as any).message || 'You need at least 70% to claim rewards.',
          variant: 'destructive',
        });
      } else {
        console.error('Unexpected response from function', data);
        toast({
          title: 'Error',
          description: 'Failed to claim reward. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
      toast({
        title: 'Error',
        description: 'Failed to claim reward. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClaimingReward(false);
    }
  };

  const handleStartQuiz = (quizId: number, locked: boolean) => {
    if (locked) {
      toast({
        title: 'Quiz Locked',
        description: 'Complete previous quizzes to unlock this one.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedQuiz(quizId);
  };

  const selectedQuizData = quizzes.find((q) => q.id === selectedQuiz);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">Error loading quizzes: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Quiz Arena 🎯</h1>
        <p className="text-muted-foreground text-lg">
          Test your crypto knowledge and earn XP
        </p>
      </div>

      {!connected && (
        <Card className="border-2 border-accent/50 bg-accent/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Coins className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-1">
                  Connect Wallet to Earn JIET Tokens! 🪙
                </h3>
                <p className="text-sm text-muted-foreground">
                  Complete quizzes with 70% or higher and claim JIET token rewards directly to your Solana wallet.
                  Connect your wallet in the Rewards section to start earning!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total XP</p>
                <p className="text-2xl font-bold text-foreground">{getTotalXP()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {quizzes.filter((q) => getQuizScore(q.id) !== undefined).length}/{quizzes.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold text-foreground">{getAverageScore()}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.map((quiz) => {
          const userScore = getQuizScore(quiz.id);
          const isCompleted = userScore !== undefined;
          const canClaimReward = isCompleted && userScore >= 70 && !isRewardClaimed(quiz.id);

          return (
            <Card key={quiz.id} className="border-2 hover:border-primary/50 transition-all group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7 text-primary" />
                    </div>
                    {isCompleted && <CheckCircle className="w-6 h-6 text-green-500" />}
                    {quiz.is_locked && <Lock className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <Badge className={getDifficultyColor(quiz.difficulty)}>{quiz.difficulty}</Badge>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">{quiz.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{quiz.description}</p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>{quiz.question_count} Qs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{quiz.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-primary font-medium">{quiz.xp_reward} XP</span>
                  </div>
                </div>

                {isCompleted && (
                  <div className="mb-4 space-y-2">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">Best Score:</p>
                        <p className="text-lg font-bold text-green-500">{userScore}%</p>
                      </div>
                    </div>
                    {canClaimReward && connected && (
                      <Button
                        onClick={() => handleClaimReward(quiz.id, userScore)}
                        disabled={isClaimingReward}
                        variant="outline"
                        className="w-full border-accent/50 hover:bg-accent/10"
                        size="sm"
                      >
                        <Coins className="w-4 h-4 mr-2" />
                        {isClaimingReward ? 'Claiming...' : `Claim ${quiz.jiet_reward} JIET`}
                      </Button>
                    )}
                    {isRewardClaimed(quiz.id) && (
                      <div className="p-2 bg-accent/10 border border-accent/20 rounded-lg text-center">
                        <p className="text-xs text-accent font-medium">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          JIET Reward Claimed
                        </p>
                      </div>
                    )}
                    {isCompleted && userScore < 70 && (
                      <div className="p-2 bg-muted border border-border rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">
                          Score 70% or higher to claim JIET rewards
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => handleStartQuiz(quiz.id, quiz.is_locked || false)}
                  disabled={quiz.is_locked}
                  className="w-full"
                  size="lg"
                >
                  {quiz.is_locked ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Locked
                    </>
                  ) : isCompleted ? (
                    'Retake Quiz'
                  ) : (
                    'Start Quiz'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedQuizData && selectedQuizQuestions.length > 0 && (
        <QuizModal
          open={selectedQuiz !== null}
          onOpenChange={(open) => !open && setSelectedQuiz(null)}
          quizTitle={selectedQuizData.title}
          questions={selectedQuizQuestions as any}
          xpReward={selectedQuizData.xp_reward}
          onComplete={(score) => handleQuizComplete(selectedQuiz!, score)}
        />
      )}
    </div>
  );
};

export default Quiz;
