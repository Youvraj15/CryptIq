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
import { Loader2, Flag, Link, FileText, Code } from 'lucide-react';

// Define the shape of the challenge data
interface ChallengeData {
  text?: string;
  link?: string;
  code?: string;
  challenge_file?: string;
}

interface LabModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labTitle: string;
  labDescription: string;
  challengeData: ChallengeData | null; // <-- NEW: Pass the challenge data
  xpReward: number;
  onFlagSubmit: (flag: string) => Promise<{ success: boolean; message: string }>;
  onCompletion: () => void;
}

// Helper component to render the challenge data
const ChallengeContent = ({ data }: { data: ChallengeData }) => {
  return (
    <div className="space-y-4">
      {data.text && (
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
          <p className="text-sm text-muted-foreground">{data.text}</p>
        </div>
      )}
      {data.link && (
        <div className="flex items-center gap-3">
          <Link className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {data.link}
          </a>
        </div>
      )}
      {data.challenge_file && (
        <div className="flex items-center gap-3">
          <Link className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <a
            href={data.challenge_file}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Download Challenge File
          </a>
        </div>
      )}
      {data.code && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Code className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Contract Code:</p>
          </div>
          <pre className="bg-muted text-muted-foreground p-4 rounded-md text-xs overflow-x-auto">
            <code>{data.code}</code>
          </pre>
        </div>
      )}
    </div>
  );
};


export const LabModal = ({
  open,
  onOpenChange,
  labTitle,
  labDescription,
  challengeData,
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
        onCompletion();
        onOpenChange(false);
      } else {
        setError(result.message || 'Incorrect flag.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{labTitle}</DialogTitle>
          <DialogDescription className="pt-2">
            {labDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* NEW: Render Challenge Data */}
          {challengeData && (
            <div>
              <h4 className="font-semibold mb-3">Challenge Info</h4>
              <ChallengeContent data={challengeData} />
            </div>
          )}

          <div className="border-t pt-6 space-y-4">
            <p className="text-lg font-semibold text-primary">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};