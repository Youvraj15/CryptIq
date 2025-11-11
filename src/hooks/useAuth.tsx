import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any; }>; // <-- Add this
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-redirect to dashboard only from auth pages
  useEffect(() => {
    if (user && !loading) {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/login' || currentPath === '/register' || currentPath === '/verify-otp') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in with:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Sign in result:', { data, error });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      toast.success('Signed in successfully!');
      return { error: null };
    } catch (err) {
      console.error('Sign in error:', err);
      toast.error('An unexpected error occurred');
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    console.log('Attempting sign up with:', email);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });
      
      console.log('Sign up result:', { data, error });
      
      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      if (data?.user && !data.session) {
        // Store email for OTP verification
        localStorage.setItem('verificationEmail', email);
        toast.success('Please check your email to verify your account');
        navigate('/verify-otp');
      } else {
        toast.success('Account created successfully!');
      }
      
      return { error: null };
    } catch (err) {
      console.error('Sign up error:', err);
      toast.error('An unexpected error occurred');
      return { error: err };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed out successfully');
      navigate('/login');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Reset link sent! Check your email.');
      return { error: null };
    } catch (err) {
      console.error('Forgot password error:', err);
      toast.error('An unexpected error occurred');
      return { error: err };
    }
  };

  // --- New Function ---
  const signInWithGoogle = async () => {
    console.log('Attempting Google sign in');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard` // Optional: specify redirect
        }
      });
      
      console.log('Google sign in result:', { data, error });

      if (error) {
        toast.error(error.message);
        return { error };
      }
      
      return { error: null };
    } catch (err) {
      console.error('Google sign in error:', err);
      toast.error('An unexpected error occurred');
      return { error: err };
    }
  };
  // --------------------

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    forgotPassword,
    signInWithGoogle, // <-- Add this
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}