import { LoginCredentials, RegisterData, User } from "@/types";
import { api } from "./supabase";

// Simple token storage using AsyncStorage-like pattern
// In React Native, you'd use @react-native-async-storage/async-storage
// For now we use in-memory storage which resets on app restart
const TOKEN_KEY = 'auth_token';

export const authService = {
  /**
   * Register a new user (with pending approval for non-admin roles)
   */
  async register(
    data: RegisterData,
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        role: data.role,
        department: data.department,
        identification_number: data.identification_number,
        document_url: data.document_url,
        document_file_name: data.document_file_name,
      });

      return { user: response.user as User, error: null };
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
      const response = await api.post('/auth/login', {
        email: credentials.email,
        password: credentials.password,
      });

      // Store the token for subsequent requests
      if (response.session?.access_token) {
        api.setToken(response.session.access_token);
      }

      return {
        user: response.user as User,
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
      await api.post('/auth/logout');
      api.clearToken();
      return { error: null };
    } catch (error) {
      api.clearToken(); // Clear even on error
      return { error: (error as Error).message };
    }
  },

  /**
   * Get current user using stored token
   */
  async getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await api.get('/auth/me');
      return { user: response.user as User, error: null };
    } catch (error) {
      // No valid token or session expired - just return null
      api.clearToken();
      return { user: null, error: null };
    }
  },

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      await api.post('/auth/reset-password', { email });
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      await api.put('/auth/update-password', { new_password: newPassword });
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Listen to auth state changes
   * Note: With token-based auth, real-time subscriptions are not available.
   * The app relies on manual token management.
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },
};