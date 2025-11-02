import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Award, CheckCircle, Lock, TrendingUp, Target, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QuizModal } from '@/components/QuizModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { supabaseDb } from '@/lib/supabase-types';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils'; // Make sure to import cn

// --- NEW Interfaces ---

// Based on Supabase 'quizzes' table
interface Quiz {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  xp_reward: number;
  duration_minutes: number;
  question_count: number;
  is_locked: boolean;
}

// Based on Supabase 'quiz_questions' table and Modal props
interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const Quiz = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]); // State for DB quizzes
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<Question[]>([]); // State for selected quiz questions
  const [selectedQuiz, setSelectedQuiz] = useState<number | null>(null);
  const [quizScores, setQuizScores] = useState<Record<number, number>>({});
  const [rewardedQuizzes, setRewardedQuizzes] = useState<Set<number>>(new Set());
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const { toast } = useToast();
  const { publicKey, connected } = useWallet();
  const { user } = useAuth();

  // Load quizzes from database
  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const { data, error } = await supabaseDb
          .from('quizzes')
          .select('id, title, description, difficulty, xp_reward, duration_minutes, question_count, is_locked')
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching quizzes:', error);
          toast({ title: "Error", description: "Failed to load quizzes.", variant: "destructive" });
          return;
        }

        if (data) {
          setQuizzes(data as any);
        }
      } catch (err) {
        console.error('Failed to load quizzes', err);
      }
    };

    loadQuizzes();
  }, [toast]);

  // Load quiz completions from database
  useEffect(() => {
    const loadCompletions = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('quiz_completions')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching quiz completions:', error);
          return;
        }

        if (data) {
          const scores: Record<number, number> = {};
          const rewarded = new Set<number>();

          data.forEach((completion: any) => {
            scores[completion.quiz_id] = completion.score;
            if (completion.jiet_rewarded) {
              rewarded.add(completion.quiz_id);
            }
          });

          setQuizScores(scores);
          setRewardedQuizzes(rewarded);
        }
      } catch (err) {
        console.error('Failed to load quiz completions', err);
      }
    };

    loadCompletions();
  }, [user]);

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
    // Find quiz meta
    const quizMeta = quizzes.find(q => q.id === quizId);
    const xpToAdd = (quizMeta?.xp_reward || 0);
    
    // Check old score *before* updating state
    const oldScore = quizScores[quizId];
    const alreadyPassed = oldScore !== undefined && oldScore >= 70;

    // Update local state immediately for UI responsiveness
    setQuizScores(prev => ({ ...prev, [quizId]: score }));
    
    const isPass = score >= 70;
    
    // Only award XP if they just passed (isPass=true) AND they had not already passed (alreadyPassed=false)
    const shouldAwardXp = isPass && !alreadyPassed;

    // Save completion to database (score)
    if (user) {
      try {
        await supabase
          .from('quiz_completions')
          .upsert({
            user_id: user.id,
            quiz_id: quizId,
            score: score,
          }, { onConflict: ['user_id', 'quiz_id'] });

        // --- NEW: Update XP in user_stats table ---
        if (shouldAwardXp && xpToAdd > 0) {
          const { error: rpcError } = await supabaseDb.rpc('increment_user_xp', { 
            p_user_id: user.id, 
            p_xp_to_add: xpToAdd 
          });
          
          if (rpcError) {
            console.error('Error updating total XP:', rpcError);
            toast({ title: "Error", description: "Failed to update your total XP.", variant: "destructive" });
          } else {
            // This toast might be redundant if the modal shows XP, but good for confirmation
            toast({ title: "XP Gained!", description: `+${xpToAdd} XP added to your profile.` });
          }
        }
        // --- End of NEW ---
          
      } catch (err) {
        console.error('Error saving quiz completion:', err);
      }
    }

    // Show completion toast
    if (isPass) {
      // Passed the quiz
      if (connected && publicKey && !rewardedQuizzes.has(quizId)) {
        toast({
          title: "Quiz Passed! 🎉",
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
      } else {
        toast({
          title: "Quiz Passed! 🎉",
          description: `You scored ${score}%. ${!connected ? 'Connect your wallet to claim JIET rewards!' : ''}`,
        });
      }
    } else {
      // Failed the quiz
      toast({
        title: "Quiz Complete",
        description: `You scored ${score}%. You need 70% to pass. Try again!`,
        variant: "destructive"
      });
    }
  };


// --- REWRITTEN `handleClaimReward` ---
const handleClaimReward = async (quizId: number, score: number) => {
  if (!connected || !publicKey) {
    toast({
      title: "Wallet Not Connected",
      description: "Please connect your Solana wallet to claim rewards.",
      variant: "destructive"
    });
    return;
  }

  // Double check score
  const userScore = quizScores[quizId] ?? score;
  if (userScore < 70) {
    toast({
      title: "Score Too Low",
      description: "You must score 70% or higher to claim rewards.",
      variant: "destructive"
    });
    return;
  }

  if (rewardedQuizzes.has(quizId)) {
    toast({
      title: "Already Claimed",
      description: "You have already claimed rewards for this quiz.",
    });
    return;
  }

  setIsClaimingReward(true);

  try {
    // Get session token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('You must be logged in to claim rewards.');
    }
    const token = sessionData.session.access_token;

    // Call the edge function using supabase.functions.invoke
    // This is cleaner than fetch() as it handles headers automatically
    const { data, error } = await supabase.functions.invoke('transfer-jiet-reward', {
      body: JSON.stringify({
        quizId: quizId,
        score: userScore,
        walletAddress: publicKey.toString(),
      }),
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (error) {
      // This will catch network errors like "failed to send request"
      throw error;
    }

    // Handle application-level errors returned from the function
    if (data.success === false) {
      if (data.alreadyRewarded) {
        // Mark as rewarded locally if the server says it's already done
        setRewardedQuizzes(prev => new Set([...Array.from(prev), quizId]));
        toast({
          title: "Already Claimed",
          description: data.error || 'This reward was already claimed.',
        });
      } else {
        throw new Error(data.error || 'Unknown error occurred during claim');
      }
    } else if (data.success === true) {
      // SUCCESS!
      // Mark as rewarded locally to update the UI
      setRewardedQuizzes(prev => new Set([...Array.from(prev), quizId]));
      toast({
        title: "Reward Claimed! 🎉",
        description: `+${data.amount} JIET tokens sent to your wallet!`,
      });
    } else {
      // Fallback for unexpected response
      throw new Error('Received an unexpected response from the server.');
    }

  } catch (err: any) {
    console.error('❌ Claim error:', err);
    toast({
      title: "Claim Failed",
      description: err.message || "Failed to claim reward. Please try again.",
      variant: "destructive"
    });
  } finally {
    setIsClaimingReward(false);
  }
};
// --- END of REWRITTEN `handleClaimReward` ---


  // Fetches questions from DB and opens modal
  const handleStartQuiz = async (quizId: number, locked: boolean) => {
    if (locked) {
      toast({
        title: "Quiz Locked",
        description: "Complete previous quizzes to unlock this one.",
        variant: "destructive"
      });
      return;
    }

    // TODO: Add a loading state
    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('id, question_text, options, correct_answer_index, explanation, sort_order')
        .eq('quiz_id', quizId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Map DB data to modal's Question interface
        const formattedQuestions: Question[] = data.map((q: any, index: number) => ({
          id: q.id, // Use the actual DB ID
          question: q.question_text,
          options: q.options as string[], // Cast jsonb to string[]
          correctAnswer: q.correct_answer_index,
          explanation: q.explanation,
        }));
        
        setCurrentQuizQuestions(formattedQuestions);
        setSelectedQuiz(quizId);
      } else if (data && data.length === 0) {
         toast({ title: "Quiz Not Ready", description: "This quiz has no questions yet.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Could not load quiz questions.", variant: "destructive" });
      }
    } catch (err) {
      console.error('Error fetching quiz questions:', err);
      toast({ title: "Error", description: "Failed to load quiz.", variant: "destructive" });
    }
  };

  // total XP = sum of quiz.xp_reward for all COMPLETED (>=70%) quizzes
  const totalXP = quizzes.reduce((acc, quiz) => {
    const userScore = quizScores[quiz.id];
    if (userScore !== undefined && userScore >= 70) {
      return acc + quiz.xp_reward;
    }
    return acc;
  }, 0);

  const completedCount = Object.values(quizScores).filter(score => score >= 70).length;
  const avgScore = Object.keys(quizScores).length > 0
    ? Math.round(
        Object.values(quizScores).reduce((a, b) => a + b, 0) /
          Object.keys(quizScores).length
      )
    : 0;

  const selectedQuizData = quizzes.find(q => q.id === selectedQuiz);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Quiz Arena 🎯</h1>
        <p className="text-muted-foreground text-lg">
          Test your crypto knowledge and earn XP
        </p>
      </div>

      {/* Wallet Connection Notice */}
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
                  Complete quizzes with 70% or more to claim JIET token rewards. 
                  Connect your wallet in the Rewards section!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total XP</p>
                <p className="text-2xl font-bold text-foreground">{totalXP}</p>
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
                  {completedCount}/{quizzes.length}
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
                <p className="text-2xl font-bold text-foreground">
                  {avgScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.map((quiz) => {
          const userScore = quizScores[quiz.id];
          const isAttempted = userScore !== undefined;
          const isCompleted = isAttempted && userScore >= 70; // Completion = 70%
          const isLocked = quiz.is_locked; // Use DB field

          return (
            <Card 
              key={quiz.id} 
              className="border-2 hover:border-primary/50 transition-all group"
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7 text-primary" />
                    </div>
                    {isCompleted && ( // Show checkmark only if passed
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                    {isLocked && ( // Show lock if locked
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <Badge className={getDifficultyColor(quiz.difficulty)}>
                    {quiz.difficulty}
                  </Badge>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">
                  {quiz.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {quiz.description}
                </p>

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

                {isAttempted && (
                  <div className="mb-4 space-y-2">
                    <div className={cn(
                      "p-3 border rounded-lg",
                      isCompleted ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                    )}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-foreground">Best Score:</p>
                        <p className={cn(
                          "text-lg font-bold",
                          isCompleted ? "text-green-500" : "text-red-500"
                        )}>
                          {userScore}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Show Claim button if passed, connected, and not claimed */}
                    {isCompleted && !rewardedQuizzes.has(quiz.id) && connected && (
                      <Button
                        onClick={() => handleClaimReward(quiz.id, userScore)}
                        disabled={isClaimingReward}
                        variant="outline"
                        className="w-full border-accent/50 hover:bg-accent/10"
                        size="sm"
                      >
                        <Coins className="w-4 h-4 mr-2" />
                        {isClaimingReward ? 'Claiming...' : 'Claim JIET Reward'}
                      </Button>
                    )}
                    
                    {/* Show if reward is claimed */}
                    {rewardedQuizzes.has(quiz.id) && (
                      <div className="p-2 bg-accent/10 border border-accent/20 rounded-lg text-center">
                        <p className="text-xs text-accent font-medium">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          JIET Reward Claimed
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  onClick={() => handleStartQuiz(quiz.id, isLocked || false)}
                  disabled={isLocked}
                  className="w-full"
                  size="lg"
                >
                  {isLocked ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Locked
                    </>
                  ) : isCompleted ? (
                    'Retake Quiz'
                  ) : isAttempted ? ( // Attempted but failed (<70)
                    'Try Again'
                  ) : (
                    'Start Quiz'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quiz Modal */}
      {selectedQuizData && (
        <QuizModal
          open={selectedQuiz !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedQuiz(null);
              setCurrentQuizQuestions([]); // Clear questions on close
            }
          }}
          quizTitle={selectedQuizData.title}
          questions={currentQuizQuestions} // Pass fetched questions
          xpReward={selectedQuizData.xp_reward} // Pass full XP reward
          onComplete={(score) => handleQuizComplete(selectedQuiz!, score)}
        />
      )}
    </div>
  );
};

export default Quiz;