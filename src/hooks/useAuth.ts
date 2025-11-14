import { useState, useEffect } from 'react';
import { auth } from '@/lib/supabase';
import type { User, Session } from '@/types';
import type { AuthError } from '@supabase/supabase-js';

/**
 * Authentication state interface
 */
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * Authentication methods interface
 */
interface AuthMethods {
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

/**
 * Hook for managing authentication state and operations
 * @returns Authentication state and methods
 */
export function useAuth(): AuthState & AuthMethods {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign up a new user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise with error if any
   */
  const signUp = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  /**
   * Sign in an existing user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise with error if any
   */
  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  /**
   * Sign out the current user
   * @returns Promise with error if any
   */
  const signOut = async (): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await auth.signOut();
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signOut,
  };
}
