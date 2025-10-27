import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Flag } from 'lucide-react';

interface LabModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labTitle: string;
  labDescription: string;
  xpReward: number;
  onFlagSubmit: (flag: string) => Promise<{ success: boolean; message: string }>;
  onCompletion: () => void; // We'll call this after a successful submission
}

export const LabModal = ({
  open,
  onOpenChange,
  labTitle,
  labDescription,
  xpReward,
  onFlagSubmit,
  onCompletion,
}: LabModalProps) => {
  const [flag, setFlag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onFlagSubmit(flag);

      if (result.success) {
        // Flag is correct!
        onCompletion(); // Call the original onComplete function
        onOpenChange(false); // Close the modal
      } else {
        // Flag is incorrect
        setError(result.message || 'Incorrect flag.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when modal is closed
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setFlag('');
      setError(null);
      setIsLoading(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">{labTitle}</DialogTitle>
          <DialogDescription className="pt-2">
            {labDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-lg font-semibold text-primary mb-4">
            Reward: {xpReward} XP
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="flag" className="text-sm font-medium">
                Submit Flag
              </label>
              <Input
                id="flag"
                placeholder="flag{...}"
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Flag className="mr-2 h-4 w-4" />
                )}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};