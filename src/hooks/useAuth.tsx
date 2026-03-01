import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_TIMEOUT_MS = 12000;

const getAuthStorageKey = () => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return projectId ? `sb-${projectId}-auth-token` : null;
};

const clearStaleAuthToken = () => {
  try {
    const authStorageKey = getAuthStorageKey();
    if (authStorageKey) {
      localStorage.removeItem(authStorageKey);
    }
  } catch {
    // no-op
  }
};

const isLockTimeoutError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('lockmanager') || message.includes('timed out waiting') || message.includes('acquirelock');
};

async function withTimeout<T>(promise: Promise<T>, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), AUTH_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const normalizeAuthError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error) return error;
  return new Error(fallbackMessage);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then get initial session
    withTimeout(
      supabase.auth.getSession(),
      'Authentication initialization timed out. Please try again.'
    )
      .then(({ data: { session }, error }) => {
        if (!mounted) return;

        if (error) {
          clearStaleAuthToken();
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }

        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        clearStaleAuthToken();
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // Safety timeout – never stay loading forever
    const timeout = setTimeout(() => {
      if (!mounted) return;

      setLoading((prev) => {
        if (!prev) return prev;
        clearStaleAuthToken();
        setSession(null);
        setUser(null);
        return false;
      });
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signUp({ email, password }),
        'Sign up is taking too long. Please try again.'
      );
      return { error: error as Error | null };
    } catch (error) {
      if (isLockTimeoutError(error)) {
        clearStaleAuthToken();
      }
      return { error: normalizeAuthError(error, 'Network error. Please check your connection and try again.') };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const runSignIn = () => withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      'Sign in is taking too long. Please try again.'
    );

    try {
      const { error } = await runSignIn();
      return { error: error as Error | null };
    } catch (firstError) {
      if (isLockTimeoutError(firstError)) {
        clearStaleAuthToken();

        try {
          const { error } = await runSignIn();
          return { error: error as Error | null };
        } catch (secondError) {
          return {
            error: normalizeAuthError(
              secondError,
              'Your previous session got stuck. Please try signing in again.'
            ),
          };
        }
      }

      return { error: normalizeAuthError(firstError, 'Network error. Please check your connection and try again.') };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 'Sign out timed out.');
    } catch {
      clearStaleAuthToken();
      setSession(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
