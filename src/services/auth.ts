import { LoginCredentials, RegisterData, User } from "@/types";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export const authService = {
  /**
   * Register a new user
   */
  async register(
    data: RegisterData,
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return {
          user: null,
          error:
            "Registration successful. Please log in with your new account.",
        };
      }

      // Create user profile in database
      const { data: userData, error: dbError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          department: data.department,
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (dbError) {
        return { user: null, error: dbError.message };
      }

      return { user: userData as User, error: null };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  },

  /**
   * Login user
   */
  async login(
    credentials: LoginCredentials,
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

      if (authError) {
        return { user: null, error: authError.message };
      }

      const sessionUser = authData.user;

      if (!sessionUser) {
        return { user: null, error: "Login failed" };
      }

      const { data: userData, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("id", sessionUser.id)
        .single();

      if (dbError || !userData) {
        return {
          user: null,
          error: "User profile not found. Please contact admin.",
        };
      }

      return {
        user: userData as User,
        error: null,
      };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  },
  /**
   * Logout user
   */
  async logout(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error?.message || null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        if (sessionError.message === "Auth session missing!") {
          return { user: null, error: null };
        }
        return { user: null, error: sessionError.message };
      }

      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        return { user: null, error: null };
      }

      const { data: userData, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (dbError) {
        return { user: null, error: dbError.message };
      }

      return { user: userData as User, error: null };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  },

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error: error?.message || null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error: error?.message || null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!session?.user) {
          callback(null);
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        callback((userData as User) || null);
      },
    );
  },
};
