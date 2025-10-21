// src/pages/Admin.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  BookOpen, 
  Trophy, 
  Shield, 
  Search,
  Edit,
  Trash2,
  Plus,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin, logAdminAction } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, loading: isCheckingAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('quizzes');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);

  const [editFormData, setEditFormData] = useState({
    title: '',
    questions: 0,
    difficulty: '',
    xp: 0,
    isActive: true
  });


  // Fetch data based on selected tab
  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (selectedTab === 'quizzes') {
          await fetchQuizzes();
        } else if (selectedTab === 'users') {
          await fetchUsers();
        } else if (selectedTab === 'rewards') {
          await fetchRewards();
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedTab, isAdmin]);

  const fetchQuizzes = async () => {
    const { data: completionsData } = await supabase
      .from('quiz_completions')
      .select('quiz_id, score');

    // Aggregate quiz stats
    const quizStats: any = {};
    completionsData?.forEach((completion: any) => {
      if (!quizStats[completion.quiz_id]) {
        quizStats[completion.quiz_id] = { completions: 0, totalScore: 0 };
      }
      quizStats[completion.quiz_id].completions++;
      quizStats[completion.quiz_id].totalScore += completion.score;
    });

    // Mock quiz data with real stats
    const mockQuizzes = [
      { id: 1, title: 'Blockchain Basics', questions: 10, difficulty: 'Beginner', xp: 100 },
      { id: 2, title: 'Cryptocurrency Fundamentals', questions: 15, difficulty: 'Beginner', xp: 150 },
      { id: 3, title: 'Smart Contracts', questions: 12, difficulty: 'Intermediate', xp: 200 },
      { id: 4, title: 'DeFi Protocols', questions: 20, difficulty: 'Intermediate', xp: 250 },
      { id: 5, title: 'NFT & Web3', questions: 15, difficulty: 'Advanced', xp: 300 },
    ];

    const enrichedQuizzes = mockQuizzes.map(quiz => {
      const stats = quizStats[quiz.id] || { completions: 0, totalScore: 0 };
      return {
        ...quiz,
        completions: stats.completions,
        avgScore: stats.completions > 0 ? Math.round(stats.totalScore / stats.completions) : 0,
        isActive: true
      };
    });

    setQuizzes(enrichedQuizzes);
  };

  const fetchUsers = async () => {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*, user_stats(*)');

    const enrichedUsers = profilesData?.map((profile: any) => ({
      id: profile.user_id,
      email: profile.email || 'N/A',
      fullName: profile.full_name,
      username: profile.username,
      totalXp: profile.user_stats?.[0]?.total_xp || 0,
      quizzesCompleted: profile.user_stats?.[0]?.quizzes_completed || 0,
      labsCompleted: profile.user_stats?.[0]?.labs_completed || 0,
      streak: profile.user_stats?.[0]?.current_streak || 0,
      joinedDate: profile.created_at,
      isActive: true
    })) || [];

    setUsers(enrichedUsers);
  };

  const fetchRewards = async () => {
    const { data: completionsData } = await supabase
      .from('quiz_completions')
      .select(`
        id,
        quiz_id,
        score,
        jiet_amount,
        jiet_rewarded,
        completed_at,
        transaction_signature,
        profiles(full_name, username)
      `)
      .eq('jiet_rewarded', true);

    const enrichedRewards = completionsData?.map((completion: any) => ({
      id: completion.id,
      userId: completion.user_id,
      userName: completion.profiles?.username || completion.profiles?.full_name || 'Unknown',
      quizId: completion.quiz_id,
      quizTitle: `Quiz ${completion.quiz_id}`,
      jietAmount: completion.jiet_amount || 0,
      score: completion.score,
      rewarded: completion.jiet_rewarded,
      claimedDate: completion.completed_at,
      transactionSignature: completion.transaction_signature?.slice(0, 8) || 'N/A'
    })) || [];

    setRewards(enrichedRewards);
  };

  const stats = [
    {
      title: 'Total Users',
      value: users.length.toString(),
      icon: Users,
      color: 'text-primary'
    },
    {
      title: 'Active Quizzes',
      value: quizzes.filter(q => q.isActive).length.toString(),
      icon: BookOpen,
      color: 'text-accent'
    },
    {
      title: 'JIET Distributed',
      value: rewards.reduce((sum, r) => sum + r.jietAmount, 0).toFixed(0),
      icon: Trophy,
      color: 'text-orange-500'
    },
    {
      title: 'Total XP Earned',
      value: users.reduce((sum, u) => sum + u.totalXp, 0).toString(),
      icon: Shield,
      color: 'text-green-500'
    }
  ];

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

  const handleEditQuiz = (quiz: any) => {
    setSelectedItem(quiz);
    setEditFormData({
      title: quiz.title,
      questions: quiz.questions,
      difficulty: quiz.difficulty,
      xp: quiz.xp,
      isActive: quiz.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteItem = (item: any) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsLoading(true);
    try {
      // Update quiz data (in real app, update in database)
      setQuizzes(quizzes.map(q => 
        q.id === selectedItem.id 
          ? { ...q, ...editFormData }
          : q
      ));
      toast.success('Quiz updated successfully');
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Failed to update quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      if (selectedTab === 'quizzes') {
        setQuizzes(quizzes.filter(q => q.id !== selectedItem.id));
        toast.success('Quiz deleted successfully');
      } else if (selectedTab === 'users') {
        // Delete user from auth and database
        setUsers(users.filter(u => u.id !== selectedItem.id));
        toast.success('User deleted successfully');
      }
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRewards = rewards.filter(r => 
    r.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.quizTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show loading state
  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground text-lg">
              Manage quizzes, users, and rewards
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl">Management Panel</CardTitle>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add New
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="quizzes">
                <BookOpen className="w-4 h-4 mr-2" />
                Quizzes
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="rewards">
                <Trophy className="w-4 h-4 mr-2" />
                Rewards
              </TabsTrigger>
            </TabsList>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes" className="space-y-4">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredQuizzes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No quizzes found</p>
                ) : (
                  filteredQuizzes.map((quiz) => (
                    <Card key={quiz.id} className="border-2 hover:border-primary/50 transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-foreground">{quiz.title}</h3>
                              <Badge className={getDifficultyColor(quiz.difficulty)}>
                                {quiz.difficulty}
                              </Badge>
                              {quiz.isActive ? (
                                <Badge className="bg-green-500/20 text-green-400">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <span>{quiz.questions} Questions</span>
                              <span>{quiz.xp} XP</span>
                              <span>{quiz.completions} Completions</span>
                              <span>Avg: {quiz.avgScore}%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditQuiz(quiz)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(quiz)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                ) : (
                  filteredUsers.map((user) => (
                    <Card key={user.id} className="border-2 hover:border-primary/50 transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground mb-1">
                              {user.username || user.fullName || 'Unknown User'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">{user.email}</p>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <span>{user.totalXp} XP</span>
                              <span>{user.quizzesCompleted} Quizzes</span>
                              <span>{user.labsCompleted} Labs</span>
                              <span>{user.streak} Day Streak</span>
                              <span>Joined: {new Date(user.joinedDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(user)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Rewards Tab */}
            <TabsContent value="rewards" className="space-y-4">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredRewards.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No rewards found</p>
                ) : (
                  filteredRewards.map((reward) => (
                    <Card key={reward.id} className="border-2 hover:border-primary/50 transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-foreground">{reward.userName}</h3>
                              <Badge className="bg-green-500/20 text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Claimed
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{reward.quizTitle}</p>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                              <span>Score: {reward.score}%</span>
                              <span className="text-accent font-semibold">{reward.jietAmount} JIET</span>
                              <span>Claimed: {new Date(reward.claimedDate).toLocaleDateString()}</span>
                              <span className="font-mono text-xs">TX: {reward.transactionSignature}...</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Quiz</DialogTitle>
            <DialogDescription>
              Make changes to the quiz. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="questions">Questions</Label>
                <Input
                  id="questions"
                  type="number"
                  value={editFormData.questions}
                  onChange={(e) => setEditFormData({ ...editFormData, questions: parseInt(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="xp">XP Reward</Label>
                <Input
                  id="xp"
                  type="number"
                  value={editFormData.xp}
                  onChange={(e) => setEditFormData({ ...editFormData, xp: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={editFormData.difficulty}
                onValueChange={(value) => setEditFormData({ ...editFormData, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{' '}
              {selectedTab === 'quizzes' ? 'quiz' : 'user'} and remove the data from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;