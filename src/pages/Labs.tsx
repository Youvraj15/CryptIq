import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, CheckCircle, Lock, Code, Target, Key, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LabModal } from '@/components/LabModal';
import { useToast } from '@/hooks/use-toast';
import { useLabCompletion } from '@/hooks/useLabCompletion';
import { supabase } from '@/integrations/supabase/client';
import { supabaseDb } from '@/lib/supabase-types';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/hooks/useAuth';

// 1. Define types for our NEW data structures
interface LabCategory {
  id: number;
  title: string;
  description: string;
  icon: string;
}

interface LabTask {
  id: number;
  lab_id: number; // The category ID
  title: string;
  description: string;
  challenge_data: any; // The JSONB data
  xp_reward: number;
  is_locked: boolean;
  // Flag is NOT selected
}

// 2. Map icons (UPDATED: Removed unused icons)
const categoryIcons: { [key: string]: React.ReactNode } = {
  Key: <Key className="w-7 h-7 text-primary" />,
  Default: <Code className="w-7 h-7 text-primary" />,
};

const getCategoryIcon = (iconName: string) => {
  return categoryIcons[iconName] || categoryIcons.Default;
};

// A simple skeleton loader component for the cards
const LabCardSkeleton = () => (
  <Card className="border-2">
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="w-14 h-14 rounded-xl" />
        <Skeleton className="w-24 h-6 rounded-full" />
      </div>
      <Skeleton className="w-3/4 h-7 mb-2" />
      <Skeleton className="w-full h-5 mb-4" />
      <Skeleton className="w-1/3 h-5 mb-4" />
      <Skeleton className="w-full h-10" />
    </CardContent>
  </Card>
);

const Labs = () => {
  const [labCategories, setLabCategories] = useState<LabCategory[]>([]);
  const [labTasks, setLabTasks] = useState<LabTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<number[]>([]);
  const [rewardedTaskIds, setRewardedTaskIds] = useState<Set<number>>(new Set());
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [unclaimedRewards, setUnclaimedRewards] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  
  const { toast } = useToast();
  const { publicKey, connected } = useWallet();
  const { user } = useAuth();
  // 3. Use the updated hook functions
  const { getCompletedTasks, completeTask } = useLabCompletion();

  // 4. Fetch all data on load
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Fetch categories
        const { data: categories, error: catError } = await supabaseDb
          .from('labs')
          .select('*');
        if (catError) throw catError;
        if (categories) setLabCategories(categories as any);

        // Fetch all tasks
        const { data: tasks, error: taskError } = await supabaseDb
          .from('lab_tasks')
          .select('id, lab_id, title, description, challenge_data, xp_reward, is_locked');
        if (taskError) throw taskError;
        if (tasks) setLabTasks(tasks as any);

        // Fetch completed tasks
        const completed = await getCompletedTasks();
        setCompletedTaskIds(completed);

      } catch (error: any) {
        console.error('Error fetching lab data:', error.message);
        toast({
          title: "Error",
          description: "Could not fetch lab challenges.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllData();
  }, [getCompletedTasks, toast]);

  // Fetch unclaimed rewards
  useEffect(() => {
    const fetchUnclaimedRewards = async () => {
      if (!user) return;

      try {
        const { data: labRewards, error: labError } = await supabase
          .from('lab_completions')
          .select('jiet_amount')
          .eq('user_id', user.id)
          .eq('jiet_rewarded', false);

        if (labError) throw labError;

        const totalLab = labRewards?.reduce((sum, r) => sum + Number(r.jiet_amount), 0) || 0;
        setUnclaimedRewards(totalLab);
      } catch (error) {
        console.error('Error fetching unclaimed rewards:', error);
      }
    };

    fetchUnclaimedRewards();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('lab-rewards-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_completions',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchUnclaimedRewards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Claim all pending rewards
  const handleClaimAllRewards = async () => {
    if (!connected || !publicKey) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to claim rewards.',
        variant: 'destructive',
      });
      return;
    }

    if (unclaimedRewards <= 0) {
      toast({
        title: 'No Rewards',
        description: 'You have no unclaimed rewards.',
      });
      return;
    }

    setIsClaiming(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('You must be logged in to claim rewards.');
      }
      const token = sessionData.session.access_token;

      const { data, error } = await supabase.functions.invoke('claim-pending-rewards', {
        body: { walletAddress: publicKey.toString() },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      toast({
        title: 'Success! 🎉',
        description: `Claimed ${data.totalClaimed ?? data.amount} JIET tokens! View on Solscan: https://solscan.io/tx/${data.signature}?cluster=devnet`,
      });

      setUnclaimedRewards(0);
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      toast({
        title: 'Claim Failed',
        description: error.message || 'Failed to claim rewards. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  // Auto-claim JIET rewards for completing a lab task
  const handleClaimLabReward = async (taskId: number) => {
    if (!connected || !publicKey) {
      return; // Silently skip if wallet not connected
    }

    if (rewardedTaskIds.has(taskId)) {
      return; // Already claimed
    }

    setIsClaimingReward(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('You must be logged in to claim rewards.');
      }
      const token = sessionData.session.access_token;

      const { data, error } = await supabase.functions.invoke('transfer-lab-reward', {
        body: JSON.stringify({
          taskId: taskId,
          walletAddress: publicKey.toString(),
        }),
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (error) {
        throw error;
      }

      if (data.success === false) {
        if (data.alreadyRewarded) {
          setRewardedTaskIds(prev => new Set([...Array.from(prev), taskId]));
        } else {
          throw new Error(data.error || 'Unknown error occurred during claim');
        }
      } else if (data.success === true) {
        setRewardedTaskIds(prev => new Set([...Array.from(prev), taskId]));
        toast({
          title: "🎉 You've earned JIET Coins for completing this challenge!",
          description: `+${data.amount} JIET tokens sent to your wallet!`,
        });
      }

    } catch (err: any) {
      console.error('❌ Lab reward claim error:', err);
      toast({
        title: "Claim Failed",
        description: err.message || "Failed to claim reward. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsClaimingReward(false);
    }
  };

  // This function is now CALLED by the modal on success
  const handleTaskComplete = async (task_id: number) => {
    try {
      const result = await completeTask(task_id); // Use new hook function
      if (result && result.success && !result.alreadyCompleted) {
        setCompletedTaskIds(prev => [...prev, task_id]);
        
        // Automatically claim JIET reward if wallet is connected
        if (connected && publicKey && !rewardedTaskIds.has(task_id)) {
          handleClaimLabReward(task_id);
        }
        
        toast({
          title: 'Challenge completed! 🎉',
          description: connected ? 'Claiming your JIET tokens...' : 'Connect wallet to earn JIET tokens!'
        });
      } else if (result && result.alreadyCompleted) {
        toast({
          title: 'Already completed',
          description: 'You had already completed this challenge.'
        });
      }
    } catch (err) {
      console.error('Error completing task', err);
      toast({
        title: 'Error',
        description: 'Failed to mark challenge as completed.',
        variant: "destructive"
      });
    }
  };

  // This function calls our Edge Function
  const handleFlagSubmit = async (submitted_flag: string) => {
    if (selectedTask === null) {
      return { success: false, message: 'No task selected.' };
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('check-lab-flag', {
        body: { task_id: selectedTask, submitted_flag }, // Pass task_id
      });

      if (error) throw new Error(error.message);
      return data; 
      
    } catch (err: any) {
      console.error('Flag submission error:', err);
      return { success: false, message: err.message || 'Failed to check flag.' };
    }
  };

  const handleStartTask = (task_id: number, locked: boolean) => {
    if (locked) {
      toast({
        title: "Challenge Locked",
        description: "Complete previous challenges to unlock this one.",
        variant: "destructive"
      });
      return;
    }
    setSelectedTask(task_id);
  };

  // Calculate stats
  const completedCount = completedTaskIds.length;
  const totalXP = completedTaskIds.reduce((sum, task_id) => {
    const task = labTasks.find(t => t.id === task_id);
    return sum + (task?.xp_reward || 0);
  }, 0);

  const selectedTaskData = labTasks.find(t => t.id === selectedTask);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Crypto Challenges 🔑</h1>
        <p className="text-muted-foreground text-lg">
          Test your cryptography and code-breaking skills.
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
                  Complete lab challenges to earn JIET token rewards automatically. 
                  Connect your wallet in the Rewards section!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Claim Rewards Section */}
      {connected && unclaimedRewards > 0 && (
        <Card className="border-2 border-primary/50 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    Unclaimed Rewards Available! 🎉
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You have {unclaimedRewards} JIET tokens ready to claim
                  </p>
                </div>
              </div>
              <Button
                onClick={handleClaimAllRewards}
                disabled={isClaiming}
                size="lg"
                className="flex-shrink-0"
              >
                {isClaiming ? 'Claiming...' : 'Claim Rewards'}
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Note: We use Solana Devnet. Switch your wallet network to Devnet to view JIET tokens. You can verify transfers on Solscan (Devnet).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Challenges Solved</p>
                <p className="text-2xl font-bold text-foreground">
                  {completedCount}/{labTasks.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-accent" />
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
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold text-foreground">
                  {labTasks.length > 0 ? Math.round((completedCount / labTasks.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Render: Loop categories, THEN loop tasks */}
      <div className="space-y-10">
        {isLoading ? (
          // Show skeleton categories
          [1].map(i => (
            <section key={i} className="space-y-4">
              <Skeleton className="w-1/3 h-8" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LabCardSkeleton />
                <LabCardSkeleton />
              </div>
            </section>
          ))
        ) : (
          // Render actual categories and tasks
          labCategories.map((category) => {
            const tasksInCategory = labTasks.filter(task => task.lab_id === category.id);
            if (tasksInCategory.length === 0) return null;

            return (
              <section key={category.id} className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground border-b-2 pb-2">
                  {category.title}
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {tasksInCategory.map((task) => {
                    const isCompleted = completedTaskIds.includes(task.id);
                    
                    return (
                      <Card 
                        key={task.id} 
                        className="border-2 hover:border-primary/50 transition-all group"
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                {getCategoryIcon(category.icon)}
                              </div>
                              {isCompleted && (
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              )}
                              {task.is_locked && (
                                <Lock className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                            <Badge className="bg-green-500/20 text-green-400">
                              Cryptography
                            </Badge>
                          </div>

                          <h3 className="text-xl font-bold text-foreground mb-2">
                            {task.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            {task.description}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-primary" />
                              <span className="text-primary font-medium">{task.xp_reward} XP</span>
                            </div>
                          </div>

                          {isCompleted && (
                            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <p className="text-sm text-green-500 flex items-center gap-2 font-medium">
                                <CheckCircle className="w-4 h-4" />
                                Challenge Solved!
                              </p>
                            </div>
                          )}

                          <Button 
                            onClick={() => handleStartTask(task.id, task.is_locked)}
                            disabled={task.is_locked}
                            className="w-full"
                            size="lg"
                          >
                            {task.is_locked ? (
                              <><Lock className="w-4 h-4 mr-2" /> Locked</>
                            ) : isCompleted ? (
                              'Review'
                            ) : (
                              'Start'
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Lab Modal */}
      {selectedTaskData && selectedTask !== null && (
        <LabModal
          open={selectedTask !== null}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          labTitle={selectedTaskData.title}
          labDescription={selectedTaskData.description}
          challengeData={selectedTaskData.challenge_data} 
          xpReward={selectedTaskData.xp_reward}
          onFlagSubmit={handleFlagSubmit}
          onCompletion={() => handleTaskComplete(selectedTask!)}
        />
      )}
    </div>
  );
};

export default Labs;