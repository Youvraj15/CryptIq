import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Flame, BookOpen, FlaskConical, Gift, TrendingUp, Target, Award, Clock, CheckCircle } from 'lucide-react';
import cryptiqIllustration from '@/assets/cryptiq-learning-illustration.png';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useJietBalance } from '@/hooks/useJietBalance';

interface DashboardStats {
  quizzesCompleted: number;
  totalQuizzes: number;
  totalJIET: number;
  totalXP: number;
}

interface UserProfile {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserRanking {
  rank: number;
  totalUsers: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { balance: jietBalance } = useJietBalance();
  const [stats, setStats] = useState<DashboardStats>({
    quizzesCompleted: 0,
    totalQuizzes: 6,
    totalJIET: 0,
    totalXP: 0
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ranking, setRanking] = useState<UserRanking | null>(null);
  const [quizCompletions, setQuizCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!profileError && profileData) {
          setProfile(profileData);
        }
        
        // Fetch quiz completions
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_completions')
          .select('*')
          .eq('user_id', user.id);

        if (!quizError && quizData) {
          setQuizCompletions(quizData);
          const completedQuizzes = quizData.length;
          const totalJIET = quizData.reduce((sum, completion) => sum + (completion.jiet_amount || 0), 0);
          const totalXP = quizData.reduce((sum, completion) => sum + (completion.score * 10), 0);

          setStats({
            quizzesCompleted: completedQuizzes,
            totalQuizzes: 6,
            totalJIET,
            totalXP
          });
        }

        // Fetch user ranking based on total XP
        const { data: allUsersData, error: rankingError } = await supabase
          .from('quiz_completions')
          .select('user_id, score')
          .not('user_id', 'is', null);

        if (!rankingError && allUsersData) {
          // Calculate total XP for each user
          const userXPMap = new Map<string, number>();
          allUsersData.forEach(completion => {
            const currentXP = userXPMap.get(completion.user_id) || 0;
            userXPMap.set(completion.user_id, currentXP + (completion.score * 10));
          });

          // Sort users by XP
          const sortedUsers = Array.from(userXPMap.entries())
            .sort(([, a], [, b]) => b - a);

          // Find current user's rank
          const userIndex = sortedUsers.findIndex(([userId]) => userId === user.id);
          if (userIndex !== -1) {
            setRanking({
              rank: userIndex + 1,
              totalUsers: sortedUsers.length
            });
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const statsData = [
    { title: 'Quizzes Completed', value: stats.quizzesCompleted.toString(), total: stats.totalQuizzes.toString(), icon: BookOpen, color: 'text-primary' },
    { title: 'JIET Earned', value: stats.totalJIET.toString(), unit: 'JIET', icon: Gift, color: 'text-accent' },
    { title: 'Total XP', value: stats.totalXP.toString(), unit: 'XP', icon: Trophy, color: 'text-orange-500' },
  ];

  const xpProgress = stats.totalXP > 0 ? (stats.totalXP / 10000) * 100 : 0;

  // Calculate learning streak based on consecutive days with quiz completions
  const calculateStreak = (completions: any[]) => {
    if (completions.length === 0) return 0;
    
    const sortedDates = completions
      .map(c => new Date(c.completed_at).toDateString())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    const uniqueDates = [...new Set(sortedDates)];
    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    // Check if user completed a quiz today or yesterday
    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
      streak = 1;
      
      // Count consecutive days
      for (let i = 1; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const previousDate = new Date(uniqueDates[i - 1]);
        const diffTime = previousDate.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }
    }
    
    return streak;
  };

  const streak = calculateStreak(quizCompletions);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Welcome back, {profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'User'}! 👋
        </h1>
        <p className="text-muted-foreground text-lg">
          Track your progress and keep learning
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card className="border-2 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <img 
                    src={cryptiqIllustration} 
                    alt="Profile"
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'User'}
                    </h2>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    {profile?.created_at && (
                      <p className="text-xs text-muted-foreground">
                        Member since {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  {/* XP Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        Level Progress
                      </span>
                      <span className="text-muted-foreground">{stats.totalXP} / 10000 XP</span>
                    </div>
                    <Progress value={xpProgress} className="h-2" />
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Rank</p>
                        <p className="font-semibold text-foreground">
                          {ranking ? `#${ranking.rank}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Streak</p>
                        <p className="font-semibold text-foreground">
                          {streak > 0 ? `${streak} day${streak > 1 ? 's' : ''}` : '0 days'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    {stat.total && (
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {stat.value}/{stat.total}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </h3>
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                    {stat.unit && <span className="text-lg text-muted-foreground ml-1">{stat.unit}</span>}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quizCompletions.length > 0 ? (
                <div className="space-y-4">
                  {quizCompletions
                    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
                    .slice(0, 5)
                    .map((completion, index) => (
                      <div key={completion.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">
                            Quiz {completion.quiz_id} Completed
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Score: {completion.score}% • {completion.jiet_amount || 0} JIET earned
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {new Date(completion.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No quiz completions yet</p>
                  <p className="text-sm">Start taking quizzes to see your activity here!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - HIET Balance */}
        <div className="lg:col-span-1">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-accent" />
                JIET Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-accent">{jietBalance.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">JIET Tokens</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalJIET}</p>
                <p className="text-sm text-muted-foreground">JIET Earned</p>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.quizzesCompleted < 6 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-medium text-foreground">Complete More Quizzes</p>
                    <p className="text-sm text-muted-foreground">
                      You've completed {stats.quizzesCompleted} of 6 quizzes. Keep going!
                    </p>
                  </div>
                  {stats.quizzesCompleted === 0 && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="font-medium text-foreground">Start Your Journey</p>
                      <p className="text-sm text-muted-foreground">
                        Take your first quiz to begin earning JIET tokens!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="font-medium text-foreground">🎉 All Quizzes Complete!</p>
                  <p className="text-sm text-muted-foreground">
                    Congratulations! You've completed all available quizzes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;