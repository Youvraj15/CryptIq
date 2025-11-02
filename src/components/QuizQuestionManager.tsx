import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabaseDb } from '@/lib/supabase-types';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// Question schema
const questionSchema = z.object({
  question_text: z.string().min(10, 'Question must be at least 10 characters'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).length(4, 'Must have exactly 4 options'),
  correct_answer_index: z.coerce.number().int().min(0).max(3, 'Must be between 0 and 3'),
  explanation: z.string().min(10, 'Explanation must be at least 10 characters'),
  sort_order: z.coerce.number().int().default(0),
});

type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  sort_order: number;
};

type QuizQuestionManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: number;
  quizTitle: string;
};

export const QuizQuestionManager = ({ open, onOpenChange, quizId, quizTitle }: QuizQuestionManagerProps) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch questions when dialog opens
  useEffect(() => {
    if (open) {
      fetchQuestions();
    }
  }, [open, quizId]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseDb
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuestions((data || []) as any);
    } catch (error: any) {
      toast({
        title: 'Error loading questions',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingQuestion(null);
    setIsQuestionDialogOpen(true);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setIsQuestionDialogOpen(true);
  };

  const handleDelete = (question: Question) => {
    setDeletingQuestion(question);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingQuestion) return;

    try {
      const { error } = await supabaseDb
        .from('quiz_questions')
        .delete()
        .eq('id', deletingQuestion.id);

      if (error) throw error;

      toast({
        title: 'Question Deleted',
        description: 'Question removed successfully.',
      });
      fetchQuestions();
    } catch (error: any) {
      toast({
        title: 'Error deleting question',
        description: error.message,
        variant: 'destructive',
      });
    }
    setIsDeleteDialogOpen(false);
    setDeletingQuestion(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Questions: {quizTitle}</DialogTitle>
            <DialogDescription>
              Add, edit, or delete questions for this quiz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Badge variant="outline">
                {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
              </Badge>
              <Button onClick={handleAddNew} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : questions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No questions yet. Add your first question!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Badge variant="secondary">Q{index + 1}</Badge>
                            {question.question_text}
                          </CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(question)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded border ${
                            optIndex === question.correct_answer_index
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-border'
                          }`}
                        >
                          <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option}
                          {optIndex === question.correct_answer_index && (
                            <Badge variant="default" className="ml-2 bg-green-500">
                              Correct
                            </Badge>
                          )}
                        </div>
                      ))}
                      <div className="pt-2 text-sm text-muted-foreground">
                        <strong>Explanation:</strong> {question.explanation}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Edit/Add Dialog */}
      <QuestionEditDialog
        open={isQuestionDialogOpen}
        onOpenChange={setIsQuestionDialogOpen}
        question={editingQuestion}
        quizId={quizId}
        onSave={fetchQuestions}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this question. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Question Edit/Add Dialog Component
const QuestionEditDialog = ({
  open,
  onOpenChange,
  question,
  quizId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  quizId: number;
  onSave: () => void;
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: question || {
      question_text: '',
      options: ['', '', '', ''],
      correct_answer_index: 0,
      explanation: '',
      sort_order: 0,
    },
  });

  // Reset form when question changes
  useEffect(() => {
    if (question) {
      form.reset(question);
    } else {
      form.reset({
        question_text: '',
        options: ['', '', '', ''],
        correct_answer_index: 0,
        explanation: '',
        sort_order: 0,
      });
    }
  }, [question, open, form]);

  const onSubmit = async (values: z.infer<typeof questionSchema>) => {
    setIsSaving(true);
    try {
      if (question) {
        // Update existing question
        const { error } = await supabaseDb
          .from('quiz_questions')
          .update(values)
          .eq('id', question.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Question updated successfully.' });
      } else {
        // Insert new question
        const { error } = await supabaseDb
          .from('quiz_questions')
          .insert({
            ...values,
            quiz_id: quizId,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Question added successfully.' });
      }
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error saving question',
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
          <DialogTitle>{question ? 'Edit Question' : 'Add New Question'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter the question..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Answer Options</FormLabel>
              {[0, 1, 2, 3].map((index) => (
                <FormField
                  key={index}
                  control={form.control}
                  name={`options.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex gap-2">
                          <span className="font-medium pt-2">{String.fromCharCode(65 + index)}.</span>
                          <Input {...field} placeholder={`Option ${index + 1}`} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormField
              control={form.control}
              name="correct_answer_index"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correct Answer (0=A, 1=B, 2=C, 3=D)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Explain the correct answer..." rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Question'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
