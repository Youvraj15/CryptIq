// src/pages/Admin.tsx - Fixed version
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Edit, Trash2, Users, BookCopy, CheckSquare, FileQuestion } from 'lucide-react';

import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { supabaseDb } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { QuizQuestionManager } from '@/components/QuizQuestionManager';

// Zod schema for quiz form validation, matching your DB
const quizFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description is required'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  xp_reward: z.coerce.number().int().min(0, 'XP must be 0 or more'),
  jiet_reward: z.coerce.number().min(0, 'JIET must be 0 or more'),
  duration_minutes: z.coerce.number().int().min(1, 'Duration must be at least 1'),
  question_count: z.coerce.number().int().min(1, 'Must have at least 1 question'),
  is_locked: z.boolean().default(false),
  sort_order: z.coerce.number().int().default(0),
});

// Type definition for a Quiz based on your schema
type Quiz = z.infer<typeof quizFormSchema> & { id: number };

// Type definition for Users
type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  user_stats: {
    total_xp: number;
    quizzes_completed: number;
    labs_completed: number;
  } | null;
  admin_roles: {
    role: string;
  } | null;
};

// --- Main Admin Page Component ---

const Admin = () => {
  // FIX: Changed from isLoading to loading to match useAdmin hook
  const { isAdmin, isSuperAdmin, loading: isAdminLoading } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // --- Data States (Initialized as empty arrays) ---
  const [stats, setStats] = useState({ users: 0, quizzes: 0, completions: 0 });
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<any[]>([]);

  // --- Data Fetching Function ---
  const fetchData = async () => {
    if (!user || !isAdmin) {
      console.log('Skipping fetch - not admin or no user');
      return;
    }
    setIsLoading(true);
    try {
      console.log('Fetching admin data...');
      
      // 1. Fetch Stats
      const [userStats, quizStats, completionStats] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabaseDb.from('quizzes').select('*', { count: 'exact', head: true }),
        supabase.from('quiz_completions').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        users: userStats.count ?? 0,
        quizzes: quizStats.count ?? 0,
        completions: completionStats.count ?? 0,
      });
      console.log('Stats:', { users: userStats.count, quizzes: quizStats.count, completions: completionStats.count });

      // 2. Fetch Quizzes, Users, User Stats, Admin Roles, and Recent Activity
      const [quizData, profilesData, userStatsData, adminRolesData, completionData] = await Promise.all([
        supabaseDb.from('quizzes').select('*').order('sort_order', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabaseDb.from('user_stats').select('*'),
        supabaseDb.from('admin_roles').select('*'),
        supabase
          .from('quiz_completions')
          .select('id, score, completed_at, user_id, quiz_id')
          .order('completed_at', { ascending: false })
          .limit(5),
      ]);

      if (quizData.error) throw new Error(`Quizzes Error: ${quizData.error.message}`);
      if (profilesData.error) throw new Error(`Profiles Error: ${profilesData.error.message}`);
      if (userStatsData.error) throw new Error(`User Stats Error: ${userStatsData.error.message}`);
      if (adminRolesData.error) throw new Error(`Admin Roles Error: ${adminRolesData.error.message}`);
      if (completionData.error) throw new Error(`Completions Error: ${completionData.error.message}`);
      
      // Combine user data from different tables
      const combinedUsers: UserProfile[] = (profilesData.data || []).map((profile: any) => {
        const stats = (userStatsData.data || []).find((s: any) => s.user_id === profile.user_id);
        const adminRole = (adminRolesData.data || []).find((r: any) => r.user_id === profile.user_id);
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          username: profile.username,
          user_stats: stats ? {
            total_xp: stats.total_xp,
            quizzes_completed: stats.quizzes_completed,
            labs_completed: stats.labs_completed,
          } : null,
          admin_roles: adminRole ? { role: adminRole.role } : null,
        };
      });

      // Enrich completions with user and quiz data
      const enrichedCompletions = (completionData.data || []).map((comp: any) => {
        const profile = combinedUsers.find(u => u.user_id === comp.user_id);
        const quiz = (quizData.data || []).find((q: any) => q.id === comp.quiz_id);
        
        return {
          id: comp.id,
          score: comp.score,
          completed_at: comp.completed_at,
          profiles: profile ? { username: profile.username } : null,
          quizzes: quiz ? { title: quiz.title } : null,
        };
      });
      
      // Ensure data is always an array
      setQuizzes((quizData.data || []) as any);
      setUsers(combinedUsers); 
      setRecentCompletions(enrichedCompletions);
      
      console.log('Data loaded:', {
        quizzes: quizData.data?.length,
        users: combinedUsers.length,
        completions: enrichedCompletions.length
      });

    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Error fetching admin data',
        description: error.message,
        variant: 'destructive',
      });
      // Set ALL to empty arrays on error to prevent .map crash
      setQuizzes([]);
      setUsers([]);
      setRecentCompletions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on load and when admin status is confirmed
  useEffect(() => {
    console.log('useEffect triggered:', { user: !!user, isAdmin, isAdminLoading });
    if (user && isAdmin && !isAdminLoading) {
      fetchData();
    } else if (!isAdminLoading) {
      setIsLoading(false);
    }
  }, [user, isAdmin, isAdminLoading]);

  // --- Auth & Loading Guards ---
  if (isAdminLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
        <p>You must be an admin to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Manage quizzes, users, and platform settings.
        </p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        
        {/* --- Dashboard Tab --- */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                <BookCopy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.quizzes}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completions</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completions}</div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Quiz Completions</CardTitle>
              <CardDescription>The 5 most recent quiz attempts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : !Array.isArray(recentCompletions) || recentCompletions.length === 0 ? (
                     <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No completions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentCompletions.map((comp) => (
                      <TableRow key={comp.id}>
                        <TableCell>{comp.profiles?.username || 'N/A'}</TableCell>
                        <TableCell>{comp.quizzes?.title || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={comp.score >= 70 ? 'default' : 'destructive'}>
                            {comp.score}%
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(comp.completed_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Quizzes Tab --- */}
        <TabsContent value="quizzes">
          <QuizManagementTab quizzes={quizzes} refetchQuizzes={fetchData} />
        </TabsContent>

        {/* --- Users Tab --- */}
        <TabsContent value="users">
          <UserManagementTab users={users} isLoading={isLoading} />
        </TabsContent>
        
      </Tabs>
    </div>
  );
};

// --- Quiz Management Component ---

const QuizManagementTab = ({ quizzes, refetchQuizzes }: { quizzes: Quiz[], refetchQuizzes: () => void }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isQuestionManagerOpen, setIsQuestionManagerOpen] = useState(false);
  const [quizForQuestions, setQuizForQuestions] = useState<{ id: number; title: string } | null>(null);
  const { toast } = useToast();

  const handleEdit = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedQuiz(null);
    setIsDialogOpen(true);
  };
  
  const handleDelete = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setIsAlertOpen(true);
  };

  const handleManageQuestions = (quiz: Quiz) => {
    setQuizForQuestions({ id: quiz.id, title: quiz.title });
    setIsQuestionManagerOpen(true);
  };

  const deleteQuiz = async () => {
    if (!selectedQuiz) return;
    
    const { error: questionsError } = await supabaseDb
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', selectedQuiz.id);
      
    if (questionsError) {
      toast({ title: 'Error deleting questions', description: questionsError.message, variant: 'destructive' });
      return;
    }

    const { error: completionsError } = await supabase
      .from('quiz_completions')
      .delete()
      .eq('quiz_id', selectedQuiz.id);

    if (completionsError) {
      toast({ title: 'Error deleting completions', description: completionsError.message, variant: 'destructive' });
      return;
    }
      
    const { error: quizError } = await supabaseDb
      .from('quizzes')
      .delete()
      .eq('id', selectedQuiz.id);
      
    if (quizError) {
      toast({ title: 'Error deleting quiz', description: quizError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Quiz Deleted', description: 'The quiz, questions, and completions were removed.' });
      refetchQuizzes();
    }
    setIsAlertOpen(false);
    setSelectedQuiz(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Quizzes</CardTitle>
          <CardDescription>Add, edit, or delete platform quizzes.</CardDescription>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Quiz
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Locked</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!Array.isArray(quizzes) || quizzes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No quizzes found. Add one!
                </TableCell>
              </TableRow>
            ) : (
              quizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell>{quiz.title}</TableCell>
                  <TableCell><Badge>{quiz.difficulty}</Badge></TableCell>
                  <TableCell>{quiz.xp_reward}</TableCell>
                  <TableCell>{quiz.question_count}</TableCell>
                  <TableCell>{quiz.is_locked ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(quiz)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleManageQuestions(quiz)}>
                      <FileQuestion className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(quiz)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      <QuizEditDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        quiz={selectedQuiz}
        onSave={refetchQuizzes}
      />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedQuiz?.title}" and all its questions
              and user completions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteQuiz}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Question Manager Dialog */}
      {quizForQuestions && (
        <QuizQuestionManager
          open={isQuestionManagerOpen}
          onOpenChange={setIsQuestionManagerOpen}
          quizId={quizForQuestions.id}
          quizTitle={quizForQuestions.title}
        />
      )}
      
    </Card>
  );
};

// --- Quiz Edit/Create Dialog Component ---

const QuizEditDialog = ({ open, onOpenChange, quiz, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
  onSave: () => void;
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<z.infer<typeof quizFormSchema>>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: quiz || {
      title: '',
      description: '',
      difficulty: 'Beginner',
      xp_reward: 100,
      jiet_reward: 10,
      duration_minutes: 15,
      question_count: 5,
      is_locked: false,
      sort_order: 0,
    },
  });

  // Reset form when quiz prop changes
  useEffect(() => {
    if (quiz) {
      form.reset(quiz);
    } else {
      form.reset({
        title: '',
        description: '',
        difficulty: 'Beginner',
        xp_reward: 100,
        jiet_reward: 10,
        duration_minutes: 15,
        question_count: 5,
        is_locked: false,
        sort_order: 0,
      });
    }
  }, [quiz, open, form]);

  const onSubmit = async (values: z.infer<typeof quizFormSchema>) => {
    setIsSaving(true);
    try {
      if (quiz) {
        const { error } = await supabaseDb
          .from('quizzes')
          .update(values)
          .eq('id', quiz.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Quiz updated successfully.' });
      } else {
        // Get the next available ID
        const { data: maxIdData } = await supabaseDb
          .from('quizzes')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        const nextId = maxIdData ? maxIdData.id + 1 : 1;
        
        const { data, error } = await supabaseDb
          .from('quizzes')
          .insert({ ...values, id: nextId })
          .select('id')
          .single();
          
        if (error) throw error;
        if (!data) throw new Error("Could not retrieve new quiz ID.");
        
        toast({ title: 'Success', description: 'Quiz created successfully.' });
      }
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error saving quiz',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quiz ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
          <DialogDescription>
            {quiz ? `Editing "${quiz.title}"` : 'Fill out the details for the new quiz.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="xp_reward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>XP Reward</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="jiet_reward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>JIET Reward</FormLabel>
                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="question_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Questions</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormDescription>Lower numbers appear first.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_locked"
                render={({ field }) => (
                  <FormItem className="flex flex-col rounded-lg border p-4">
                    <FormLabel>Locked</FormLabel>
                    <FormDescription>Is this quiz locked by default?</FormDescription>
                    <FormControl>
                      <Switch 
                        className="mt-2"
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// --- User Management Component ---

const UserManagementTab = ({ users, isLoading }: { users: UserProfile[], isLoading: boolean }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Users</CardTitle>
        <CardDescription>View user profiles, stats, and roles.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Total XP</TableHead>
              <TableHead>Quizzes</TableHead>
              <TableHead>Labs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : !Array.isArray(users) || users.length === 0 ? (
               <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.full_name || 'N/A'}</TableCell>
                  <TableCell>
                    {user.admin_roles?.role === 'admin' ? (
                      <Badge>Admin</Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.user_stats?.total_xp || 0}</TableCell>
                  <TableCell>{user.user_stats?.quizzes_completed || 0}</TableCell>
                  <TableCell>{user.user_stats?.labs_completed || 0}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Admin;