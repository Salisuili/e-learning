import { authService } from '@/services/auth';
import { User } from '@/types';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: string, department: string, identificationNumber?: string, documentUrl?: string, documentFileName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);    // Only for initial auth check on app start
  const [submitting, setSubmitting] = useState(false); // For login/register/logout actions
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { user: currentUser, error: err } = await authService.getCurrentUser();
        if (err) {
          console.error('Auth error:', err);
        }
        setUser(currentUser);
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: subscription } = authService.onAuthStateChange((updatedUser) => {
      setUser(updatedUser);
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setSubmitting(true);
      const { user: loggedInUser, error: err } = await authService.login({ email, password });
      
      if (err) {
        setError(err);
        return;
      }

      if (!loggedInUser) {
        setError('Account profile not found. Please register a new account or contact an administrator.');
        return;
      }
      
      setUser(loggedInUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    role: string,
    department: string,
    identificationNumber?: string,
    documentUrl?: string,
    documentFileName?: string
  ) => {
    try {
      setError(null);
      setSubmitting(true);
      const { user: newUser, error: err } = await authService.register({
        email,
        password,
        full_name: fullName,
        role: role as 'student' | 'lecturer' | 'admin',
        department,
        identification_number: identificationNumber,
        document_url: documentUrl,
        document_file_name: documentFileName,
      });

      if (err) {
        setError(err);
        return;
      }

      if (!newUser) {
        setError('Registration failed. Could not create your profile. Please try again or contact an administrator.');
        return;
      }

      setUser(newUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setSubmitting(true);
      const { error: err } = await authService.logout();
      
      if (err) {
        setError(err);
        return;
      }
      
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, submitting, error, login, register, logout, resetError }}>
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
