import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, CheckCircle, Lock, Code, Target, Bug, Key, Binary } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LabModal } from '@/components/LabModal';
import { labTasksData } from '@/data/labTasks';
import { useToast } from '@/hooks/use-toast';
import { useLabCompletion } from '@/hooks/useLabCompletion';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import { Skeleton } from '@/components/ui/skeleton';

// 1. Define a type for our Lab data from the database
interface Lab {
  id: number;
  title: string;
  description: string;
  xp_reward: number;
  category: string;
  is_locked: boolean;
  created_at: string;
}

// 2. Define categories for the UI (this stays hard-coded)
const labCategories = [
  { title: 'Web Exploitation', category: 'Web', icon: <Bug className="w-7 h-7 text-primary" /> },
  { title: 'Smart Contract', category: 'Smart Contract', icon: <Binary className="w-7 h-7 text-primary" /> },
  { title: 'Cryptography', category: 'Crypto', icon: <Key className="w-7 h-7 text-primary" /> },
  { title: 'Miscellaneous', category: 'Misc', icon: <Code className="w-7 h-7 text-primary" /> },
];

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
  // 3. Set up state for labs, loading, and selection
  const [labs, setLabs] = useState<Lab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState<number | null>(null);
  
  // States for completed labs (from hook)
  const [completedLabIds, setCompletedLabIds] = useState<number[]>([]);
  
  const { toast } = useToast();
  const { getCompletedLabs, completeLab } = useLabCompletion();

  // 4. Fetch all labs from Supabase on component mount
  useEffect(() => {
    const fetchLabs = async () => {
      setIsLoading(true);
      try {
        // This 'labs' table is the one we created in SQL
        const { data, error } = await supabase
          .from('labs')
          .select('*')
          .order('id', { ascending: true });

        if (error) {
          throw error;
        }
        if (data) {
          setLabs(data);
        }
      } catch (error: any) {
        console.error('Error fetching labs:', error.message);
        toast({
          title: "Error",
          description: "Could not fetch lab challenges.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLabs();
  }, [toast]);

  // 5. Load completed labs (from the hook)
  useEffect(() => {
    let mounted = true;
    const loadCompleted = async () => {
      try {
        // This function is from useLabCompletion.tsx and needs no changes
        const completed = await getCompletedLabs();
        if (mounted && Array.isArray(completed)) {
          setCompletedLabIds(completed);
        }
      } catch (err) {
        console.error('Failed to load completed labs', err);
      }
    };
    loadCompleted();
    return () => { mounted = false; };
  }, [getCompletedLabs]);

  // Handle lab completion (this logic remains the same)
  const handleLabComplete = async (labId: number) => {
    try {
      // This function is from useLabCompletion.tsx and needs no changes
      const result = await completeLab(labId);
      if (result && result.success && !result.alreadyCompleted) {
        setCompletedLabIds(prev => {
          if (prev.includes(labId)) return prev;
          return [...prev, labId];
        });
        toast({
          title: 'Challenge completed!',
          description: 'XP awarded!'
        });
      } else if (result && result.alreadyCompleted) {
        toast({
          title: 'Already completed',
          description: 'You had already completed this challenge.'
        });
      }
    } catch (err) {
      console.error('Error completing lab', err);
      toast({
        title: 'Error',
        description: 'Failed to mark challenge as completed.',
        variant: 'destructive'
      });
    }
  };

  const handleStartLab = (labId: number, locked: boolean) => {
    if (locked) {
      toast({
        title: "Challenge Locked",
        description: "Complete previous challenges to unlock this one.",
        variant: "destructive"
      });
      return;
    }
    setSelectedLab(labId);
  };

  // Category color logic (uses the 'category' field from the DB)
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Web':
        return 'bg-blue-500/20 text-blue-400';
      case 'Smart Contract':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Crypto':
        return 'bg-green-500/20 text-green-400';
      case 'Misc':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // 6. Calculate stats (uses lab.xp_reward from the DB)
  const completedCount = completedLabIds.length;
  const totalXP = completedLabIds.reduce((sum, labId) => {
    const lab = labs.find(l => l.id === labId);
    return sum + (lab?.xp_reward || 0); // Use xp_reward
  }, 0);

  const selectedLabData = labs.find(l => l.id === selectedLab);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Challenges 🏴‍☠️</h1>
        <p className="text-muted-foreground text-lg">
          Test your blockchain security skills.
        </p>
      </div>

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
                  {completedCount}/{labs.length}
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
                  {labs.length > 0 ? Math.round((completedCount / labs.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Labs Categories */}
      <div className="space-y-10">
        {labCategories.map((category) => {
          // 7. Filter labs from state (uses lab.category from the DB)
          const categoryLabs = labs.filter(lab => lab.category === category.category);
          
          // Don't render empty categories
          if (!isLoading && categoryLabs.length === 0) return null;

          return (
            <section key={category.category} className="space-y-4">
              {/* Category Header */}
              <h2 className="text-2xl font-bold text-foreground border-b-2 pb-2">
                {category.title}
              </h2>

              {/* 8. Show skeletons while loading, else show labs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {isLoading ? (
                  <>
                    <LabCardSkeleton />
                    <LabCardSkeleton />
                  </>
                ) : (
                  categoryLabs.map((lab) => {
                    const isCompleted = completedLabIds.includes(lab.id);
                    
                    return (
                      <Card 
                        key={lab.id} 
                        className="border-2 hover:border-primary/50 transition-all group"
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                {category.icon || <Code className="w-7 h-7 text-primary" />}
                              </div>
                              {isCompleted && (
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              )}
                              {lab.is_locked && (
                                <Lock className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                            <Badge className={getCategoryColor(lab.category)}>
                              {lab.category}
                            </Badge>
                          </div>

                          <h3 className="text-xl font-bold text-foreground mb-2">
                            {lab.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            {lab.description}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-primary" />
                              <span className="text-primary font-medium">{lab.xp_reward} XP</span>
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
                            onClick={() => handleStartLab(lab.id, lab.is_locked)}
                            disabled={lab.is_locked}
                            className="w-full"
                            size="lg"
                          >
                            {lab.is_locked ? (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                Locked
                              </>
                            ) : isCompleted ? (
                              'Review Challenge'
                            ) : (
                              'Start Challenge'
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Lab Modal (uses xp_reward from the DB) */}
      {selectedLabData && selectedLab !== null && (
        <LabModal
          open={selectedLab !== null}
          onOpenChange={(open) => !open && setSelectedLab(null)}
          labTitle={selectedLabData.title}
          labDescription={selectedLabData.description}
          tasks={labTasksData[selectedLab as any] || []}
          xpReward={selectedLabData.xp_reward} 
          onComplete={() => handleLabComplete(selectedLab!)}
        />
      )}
    </div>
  );
};

export default Labs;