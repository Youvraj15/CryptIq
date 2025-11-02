import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Flame, BookOpen, FlaskConical, Gift, TrendingUp, Target, Award, Upload, Camera, Pencil } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { supabaseDb } from '@/lib/supabase-types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NameEditDialog } from '@/components/NameEditDialog';

interface UserStats {
  total_xp: number;
  current_streak: number;
  quizzes_completed: number;
  labs_completed: number;
  last_activity_date: string;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  total_xp: number;
  rank: number;
  isCurrentUser: boolean;
}

interface Profile {
  username: string;
  full_name: string;
  avatar_url: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    total_xp: 0,
    current_streak: 0,
    quizzes_completed: 0,
    labs_completed: 0,
    last_activity_date: new Date().toISOString(),
  });
  const [profile, setProfile] = useState<Profile>({
    username: '',
    full_name: '',
    avatar_url: '',
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [jietBalance, setJietBalance] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch user stats and profile
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('user_id', user.id)
          .single();

        if (profileData && !profileError) {
          setProfile(profileData);
        }

        // Fetch or create user stats
        let { data: statsData, error: statsError } = await supabaseDb
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (statsError && statsError.code === 'PGRST116') {
          // User stats don't exist, create them
          const { data: newStats, error: createError } = await supabaseDb
            .from('user_stats')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (newStats && !createError) {
            statsData = newStats;
          }
        }

        if (statsData) {
          setStats(statsData as any);
        }

        // Fetch JIET balance from quiz completions
        const { data: quizCompletions } = await supabase
          .from('quiz_completions')
          .select('jiet_amount')
          .eq('user_id', user.id);

        if (quizCompletions) {
          const totalJiet = quizCompletions.reduce(
            (sum, completion) => sum + (completion.jiet_amount || 0),
            0
          );
          setJietBalance(totalJiet);
        }

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Set up real-time subscription for user stats
    const statsChannel = supabase
      .channel('user_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setStats(payload.new as UserStats);
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for profile changes
    const profileChannel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const newProfile = payload.new as any;
            setProfile({
              username: newProfile.username,
              full_name: newProfile.full_name,
              avatar_url: newProfile.avatar_url,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  // Fetch leaderboard
 // Updated leaderboard fetching section for Dashboard.tsx

// Replace the existing leaderboard useEffect with this:

useEffect(() => {
  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard...');
      
      // Method 1: Using the database function (recommended)
      const { data: functionData, error: functionError} = await supabaseDb
        .rpc('get_leaderboard', { limit_count: 10 });

      if (!functionError && functionData) {
        const leaderboardData: LeaderboardEntry[] = (functionData as any[]).map((entry: any) => ({
          user_id: entry.user_id,
          username: entry.username || 'Anonymous',
          full_name: entry.full_name || '',
          avatar_url: entry.avatar_url || '',
          total_xp: entry.total_xp,
          rank: Number(entry.rank),
          isCurrentUser: entry.user_id === user?.id,
        }));

        console.log('Leaderboard data:', leaderboardData);
        setLeaderboard(leaderboardData);
        return;
      }

      console.log('Function call failed, trying manual query...', functionError);

      // Method 2: Manual query fallback
      const { data: statsData, error: statsError } = await supabaseDb
        .from('user_stats')
        .select('user_id, total_xp')
        .order('total_xp', { ascending: false })
        .limit(10);

      if (statsError) {
        console.error('Stats query error:', statsError);
        throw statsError;
      }

      if (!statsData || statsData.length === 0) {
        console.log('No user stats found');
        setLeaderboard([]);
        return;
      }

      console.log('Found stats for', statsData.length, 'users');

      // Fetch profiles
      const userIds = statsData.map(s => s.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
      }

      console.log('Found profiles for', profilesData?.length || 0, 'users');

      // Combine data
      const leaderboardData: LeaderboardEntry[] = statsData.map((stat, index) => {
        const profile = profilesData?.find(p => p.user_id === stat.user_id);
        return {
          user_id: stat.user_id,
          username: profile?.username || profile?.full_name || `User ${index + 1}`,
          full_name: profile?.full_name || '',
          avatar_url: profile?.avatar_url || '',
          total_xp: stat.total_xp,
          rank: index + 1,
          isCurrentUser: stat.user_id === user?.id,
        };
      });

      console.log('Final leaderboard:', leaderboardData);
      setLeaderboard(leaderboardData);

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard([]);
      toast.error('Failed to load leaderboard');
    }
  };

  if (user) {
    fetchLeaderboard();

    const leaderboardChannel = supabase
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leaderboardChannel);
    };
  }
}, [user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user || !event.target.files || event.target.files.length === 0) {
        return;
      }

      setUploadingAvatar(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Avatar updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const displayName = profile.username || profile.full_name || user?.email?.split('@')[0] || 'User';
  const nextLevelXP = Math.ceil((stats.total_xp + 1) / 1000) * 1000;
  const xpProgress = (stats.total_xp / nextLevelXP) * 100;
  const currentLevel = Math.floor(stats.total_xp / 1000) + 1;

  const statsCards = [
    { 
      title: 'Quizzes Completed', 
      value: stats.quizzes_completed.toString(), 
      total: '5', 
      icon: BookOpen, 
      color: 'text-primary' 
    },
    { 
      title: 'Labs Finished', 
      value: stats.labs_completed.toString(), 
      total: '4', 
      icon: FlaskConical, 
      color: 'text-accent' 
    },
    { 
      title: 'JIET Earned', 
      value: jietBalance.toFixed(1), 
      unit: 'JIET', 
      icon: Gift, 
      color: 'text-orange-500' 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">
          Welcome back, {displayName}! 👋
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
                <div className="relative group">
                  <Avatar className="w-24 h-24 ring-4 ring-primary/10">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-2xl font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {displayName}
                      </h2>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* XP Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        Level {currentLevel}
                      </span>
                      <span className="text-muted-foreground">
                        {stats.total_xp} / {nextLevelXP} XP
                      </span>
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
                          #{leaderboard.find(l => l.isCurrentUser)?.rank || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Streak</p>
                        <p className="font-semibold text-foreground">{stats.current_streak} days</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statsCards.map((stat, index) => (
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

        {/* Right Column - Leaderboard */}
        <div className="lg:col-span-1">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No leaderboard data yet
                </p>
              ) : (
                leaderboard.map((entry) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                      entry.isCurrentUser
                        ? 'bg-primary/10 border-2 border-primary/50'
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          entry.rank === 1
                            ? 'bg-yellow-500/20 text-yellow-600'
                            : entry.rank === 2
                            ? 'bg-slate-400/20 text-slate-600'
                            : entry.rank === 3
                            ? 'bg-orange-500/20 text-orange-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {entry.rank}
                      </div>
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={entry.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {entry.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`font-medium ${entry.isCurrentUser ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {entry.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`font-semibold ${entry.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                        {entry.total_xp}
                      </span>
                      <span className="text-xs text-muted-foreground">XP</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {user && (
        <NameEditDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          currentFullName={profile.full_name || ''}
          currentUsername={profile.username || ''}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Dashboard;
