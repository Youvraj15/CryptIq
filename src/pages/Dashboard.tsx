import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Flame, BookOpen, FlaskConical, Gift, TrendingUp, Target, Award } from 'lucide-react';
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

const Dashboard = () => {
  const { user } = useAuth();
  const { balance: jietBalance } = useJietBalance();
  const [stats, setStats] = useState<DashboardStats>({
    quizzesCompleted: 0,
    totalQuizzes: 6,
    totalJIET: 0,
    totalXP: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Fetch quiz completions
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_completions')
          .select('*')
          .eq('user_id', user.id);

        if (!quizError && quizData) {
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Welcome back, {user?.email?.split('@')[0] || 'User'}! 👋
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
                      {user?.email?.split('@')[0] || 'User'}
                    </h2>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
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
                        <p className="font-semibold text-foreground">#3</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Streak</p>
                        <p className="font-semibold text-foreground">7 days</p>
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;