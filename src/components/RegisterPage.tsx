import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth'; // <-- Make sure this is imported
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import cryptiqIllustration from '@/assets/cryptiq-learning-illustration.png';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  // --- Update this line ---
  const { signUp, signInWithGoogle } = useAuth(); // <-- Add signInWithGoogle
  // ------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, fullName);
    } catch (error) {
      toast.error('An unexpected error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  // --- Add this handler ---
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      // If an error occurs (e.g., popup blocked), stop loading
      setLoading(false);
    }
    // On success, Supabase handles the redirect
  };
  // -------------------------

  return (
    <div className="dark min-h-screen bg-background flex">
      {/* Left Side - Brand and Illustration */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-foreground">
              Crypt<span className="font-normal">IQ</span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium">
              Assess. Practice. Master.
            </p>
          </div>
          <div className="relative">
            <div className="w-80 h-80 mx-auto rounded-full bg-card flex items-center justify-center">
              <img 
                src={cryptiqIllustration} 
                alt="CryptIQ Learning Platform Illustration"
                className="w-80 h-80 object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-2xl font-bold text-foreground">CRYPTIQ</span>
                <GraduationCap className="w-6 h-6 text-accent" />
              </div>
              <p className="text-muted-foreground text-lg">Create Your Account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-12 px-4 border-0 border-b-2 border-muted-foreground/30 rounded-none bg-transparent focus:border-accent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground text-foreground transition-colors"
                  required
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 border-0 border-b-2 border-muted-foreground/30 rounded-none bg-transparent focus:border-accent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground text-foreground transition-colors"
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 border-0 border-b-2 border-muted-foreground/30 rounded-none bg-transparent focus:border-accent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground text-foreground transition-colors"
                  required
                />
              </div>
              
              <Button 
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-medium bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>

              {/* --- Add these new elements --- */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card text-muted-foreground">or</span>
                </div>
              </div>
              
              <Button 
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 text-base font-medium bg-accent hover:bg-accent/90 text-accent-foreground gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign Up With Google
              </Button>
              {/* ------------------------------- */}
              
              <div className="text-center pt-4">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link to="/login" className="text-accent hover:underline font-medium">
                  Sign In
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;