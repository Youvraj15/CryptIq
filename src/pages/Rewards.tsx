import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Award,
  Star,
  Gift,
  Coins,
  CheckCircle,
  Lock,
  TrendingUp,
  Target,
  Wallet,
  Unplug,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react'; // For dynamic icons
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

// Supabase & Auth
import { supabase } from '@/integrations/supabase/client';
import { supabaseDb } from '@/lib/supabase-types';
import { useAuth } from '@/hooks/useAuth'; // Assumed auth hook
import { useUserProgress } from '@/hooks/useUserProgress.tsx';

// Solana
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useJietBalance } from '@/hooks/useJietBalance';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// !!! IMPORTANT: REPLACE WITH YOUR VALUES !!!
// This is your JIET token's address on Solana.
const JIET_TOKEN_MINT = 'mntS6ZetAcdw5dLFFtLw3UEX3BZW5RkDPamSpEmpSbP';
// This is your project's wallet that will receive tokens when users redeem rewards.
const TREASURY_WALLET_ADDRESS = 'YOUR_TREASURY_WALLET_PUBLIC_KEY_HERE';

// Static definitions for achievements
const achievementDefinitions = [
  {
    id: 1,
    title: 'First Steps',
    description: 'Complete your first quiz',
    icon: Star,
    xp: 50,
  },
  {
    id: 2,
    title: 'Quick Learner',
    description: 'Complete 5 quizzes',
    icon: Award,
    xp: 100,
  },
  {
    id: 3,
    title: 'Lab Expert',
    description: 'Complete 3 practical labs',
    icon: Trophy,
    xp: 150,
  },
  {
    id: 4,
    title: 'Knowledge Master',
    description: 'Score 90% or higher in 3 quizzes',
    icon: Star,
    xp: 200,
  },
  {
    id: 5,
    title: 'DeFi Pioneer',
    description: 'Complete all DeFi-related content',
    icon: Award,
    xp: 250,
  },
  {
    id: 6,
    title: 'Blockchain Guru',
    description: 'Complete all quizzes and labs',
    icon: Trophy,
    xp: 500,
  },
];

// Type definition for rewards fetched from Supabase
type RedeemableReward = {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon_name: string; // Storing icon name as string
  available: boolean;
};

const Rewards = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { connection } = useConnection();
  const { connected, publicKey, disconnect, sendTransaction } = useWallet();
  const { balance: jietBalance, loading: jietLoading } = useJietBalance();

  // State for backend data
  const { stats, quizCompletions, labCompletions, loading: progressLoading } =
    useUserProgress();
  const [redeemableRewards, setRedeemableRewards] = useState<RedeemableReward[]>(
    []
  );
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Fetch redeemable rewards from Supabase
  useEffect(() => {
    const fetchRewards = async () => {
      setRewardsLoading(true);
      try {
        const { data, error } = await supabaseDb
          .from('rewards')
          .select('*')
          .eq('available', true)
          .order('cost', { ascending: true });

        if (error) {
          throw error;
        }
        setRedeemableRewards(data as RedeemableReward[]);
      } catch (error) {
        console.error('Error fetching rewards:', error);
        toast({
          title: 'Error',
          description: 'Could not fetch redeemable rewards.',
          variant: 'destructive',
        });
      } finally {
        setRewardsLoading(false);
      }
    };
    fetchRewards();
  }, [toast]);

  // Dynamically calculate achievements based on user progress
  const achievements = useMemo(() => {
    if (progressLoading || !stats) {
      // Return definitions with locked state while loading
      return achievementDefinitions.map((def) => ({
        ...def,
        earned: false,
        locked: true,
      }));
    }

    // Calculate earned status
    const quizzesOver90 = quizCompletions.filter((q) => q.score >= 90).length;

    return achievementDefinitions.map((def) => {
      let earned = false;
      switch (def.id) {
        case 1:
          earned = stats.quizzes_completed > 0;
          break;
        case 2:
          earned = stats.quizzes_completed >= 5;
          break;
        case 3:
          earned = stats.labs_completed >= 3;
          break;
        case 4:
          earned = quizzesOver90 >= 3;
          break;
        // ... add logic for other achievement IDs
        case 5:
          // Example: Check for specific quiz/lab completions
          earned = false; // Add your logic
          break;
        case 6:
          // Example: Check for all quizzes/labs
          earned = false; // Add your logic
          break;
      }
      return { ...def, earned, locked: !earned, earnedDate: null }; // locked: !earned is a simple example
    });
  }, [stats, quizCompletions, labCompletions, progressLoading]);

  const earnedAchievements = achievements.filter((a) => a.earned).length;

  // Handle redeeming a reward
  const handleRedeem = async (reward: RedeemableReward) => {
    if (!publicKey || !sendTransaction || !user) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to redeem.',
        variant: 'destructive',
      });
      return;
    }
    if (jietBalance < reward.cost) {
      toast({
        title: 'Insufficient JIET',
        description: 'You do not have enough tokens to redeem this reward.',
      });
      return;
    }

    setIsRedeeming(true);
    try {
      // 1. Create Solana transaction
      const mintPublicKey = new PublicKey(JIET_TOKEN_MINT);
      const toPublicKey = new PublicKey(TREASURY_WALLET_ADDRESS);

      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        publicKey
      );
      const toTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        toPublicKey
      );

      // Assuming 6 decimals for JIET token
      const amount = BigInt(Math.floor(reward.cost * 1_000_000));

      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // 2. Send transaction
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      toast({
        title: 'Transaction Sent! 🚀',
        description: `Verifying redemption... (Tx: ${signature.slice(
          0,
          10
        )}...)`,
      });

      // 3. Verify redemption with backend
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('You are not authenticated.');
      }
      const token = sessionData.session.access_token;

      const { data: funcData, error: funcError } =
        await supabase.functions.invoke('redeem-reward', {
          body: JSON.stringify({
            rewardId: reward.id,
            transactionSignature: signature,
          }),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

      if (funcError) throw new Error(funcError.message);
      if (funcData.error) throw new Error(funcData.error);
      if (!funcData.success) throw new Error('Verification failed');

      toast({
        title: 'Reward Redeemed! 🎉',
        description: `You've successfully redeemed ${reward.title}`,
      });
    } catch (error: any) {
      console.error('Redemption error:', error);
      toast({
        title: 'Redemption Failed',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const nextMilestone = 500;
  const progressToNext = (jietBalance / nextMilestone) * 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Rewards & Achievements 🏆
        </h1>
        <p className="text-muted-foreground text-lg">
          Track your progress and redeem exclusive rewards
        </p>
      </div>

      {/* Solana Wallet Connection */}
      <Card className="border-2 overflow-hidden bg-gradient-to-br from-card to-accent/5">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">
                  Solana Wallet
                </h3>
                <p className="text-sm text-muted-foreground">
                  {connected
                    ? `Connected: ${publicKey
                        ?.toString()
                        .slice(0, 4)}...${publicKey?.toString().slice(-4)}`
                    : 'Connect your wallet to view JIET tokens'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {connected && (
                <>
                  <div className="text-center bg-card/50 rounded-xl p-4 border border-accent/20">
                    <p className="text-sm text-muted-foreground mb-1">
                      JIET Balance
                    </p>
                    <p className="text-3xl font-bold text-accent">
                      {jietLoading ? '...' : jietBalance.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JIET Tokens
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={disconnect}
                    className="gap-2"
                  >
                    <Unplug className="w-5 h-5" />
                    Disconnect Wallet
                  </Button>
                </>
              )}
              {!connected && (
                <WalletMultiButton className="!bg-gradient-to-r !from-accent !to-accent/80 hover:!from-accent/90 hover:!to-accent/70 !h-12 !px-6 !rounded-xl !font-semibold !shadow-lg !shadow-accent/20 !transition-all" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* JIET Token Balance */}
      <Card className="border-2 overflow-hidden">
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Your JIET Balance
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Coins className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-5xl font-bold text-foreground">
                    {jietLoading ? '...' : jietBalance.toFixed(2)}
                  </p>
                  <span className="text-2xl font-medium text-muted-foreground">
                    JIET
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Next Milestone</span>
                  <span className="font-medium text-foreground">
                    {jietBalance.toFixed(0)}/{nextMilestone}
                  </span>
                </div>
                <Progress value={progressToNext} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Earn {Math.max(0, nextMilestone - jietBalance).toFixed(0)} more
                  JIET tokens to unlock premium rewards
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="border-2">
                <CardContent className="p-4 text-center space-y-2">
                  <Target className="w-8 h-8 mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Achievements</p>
                  {progressLoading ? (
                    <Skeleton className="h-9 w-1/2 mx-auto" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground">
                      {earnedAchievements}/{achievements.length}
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="p-4 text-center space-y-2">
                  <TrendingUp className="w-8 h-8 mx-auto text-accent" />
                  <p className="text-sm text-muted-foreground">Completion</p>
                  {progressLoading ? (
                    <Skeleton className="h-9 w-1/2 mx-auto" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground">
                      {Math.round(
                        (earnedAchievements / achievements.length) * 100
                      )}
                      %
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          Achievements
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {progressLoading
            ? // Show skeletons while loading
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-2">
                  <CardContent className="p-6">
                    <Skeleton className="w-14 h-14 rounded-xl mb-4" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-6 w-1/4" />
                  </CardContent>
                </Card>
              ))
            : // Render achievements once loaded
              achievements.map((achievement) => {
                const IconComponent = achievement.icon;
                return (
                  <Card
                    key={achievement.id}
                    className={`border-2 transition-all ${
                      achievement.earned
                        ? 'border-green-500/50 bg-green-500/5'
                        : achievement.locked
                        ? 'opacity-60'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                            achievement.earned
                              ? 'bg-green-500/20'
                              : 'bg-gradient-to-br from-primary/10 to-accent/10'
                          }`}
                        >
                          <IconComponent
                            className={`w-7 h-7 ${
                              achievement.earned
                                ? 'text-green-500'
                                : 'text-primary'
                            }`}
                          />
                        </div>
                        {achievement.earned && (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        )}
                        {!achievement.earned && achievement.locked && (
                          <Lock className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-2">
                        {achievement.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {achievement.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={achievement.earned ? 'default' : 'secondary'}
                        >
                          +{achievement.xp} XP
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </div>

      {/* Redeemable Rewards Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" />
          Redeem Rewards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rewardsLoading
            ? // Skeletons for rewards
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-2">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-10 w-1/4" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : // Render rewards
              redeemableRewards.map((reward) => {
                // Dynamically get icon component
                const IconComponent =
                  (LucideIcons as any)[reward.icon_name || 'Gift'] || Gift;
                const canAfford = jietBalance >= reward.cost;

                return (
                  <Card
                    key={reward.id}
                    className="border-2 hover:border-primary/50 transition-all group"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <IconComponent className="w-8 h-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-foreground mb-1">
                            {reward.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {reward.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Coins className="w-6 h-6 text-primary" />
                          <span className="text-xl font-bold text-foreground">
                            {reward.cost}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            JIET
                          </span>
                        </div>
                        <Button
                          onClick={() => handleRedeem(reward)}
                          disabled={!canAfford || isRedeeming || !connected}
                          size="lg"
                        >
                          {isRedeeming
                            ? 'Redeeming...'
                            : canAfford
                            ? 'Redeem'
                            : 'Insufficient JIET'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </div>
    </div>
  );
};

export default Rewards;