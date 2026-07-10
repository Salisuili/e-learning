import { User, UserRole } from "@/types";
import { api } from "./supabase";

export const userService = {
  // GET ALL USERS
  async getAllUsers(): Promise<{ users: User[] | null; error: string | null }> {
    try {
      const response = await api.get('/users');
      return { users: (response.users as User[]) || [], error: null };
    } catch (error) {
      return { users: null, error: (error as Error).message };
    }
  },

  // UPDATE USER ROLE
  async updateUserRole(
    userId: string,
    role: UserRole,
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      const response = await api.put(`/users/${userId}/role`, { role });
      return { user: response.user as User, error: null };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  },

  // GET USERS BY ROLE
  async getUsersByRole(
    role: UserRole,
  ): Promise<{ users: User[] | null; error: string | null }> {
    try {
      const response = await api.get(`/users?role=${role}`);
      return { users: (response.users as User[]) || [], error: null };
    } catch (error) {
      return { users: null, error: (error as Error).message };
    }
  },

  // DELETE USER
  async deleteUser(userId: string): Promise<{ error: string | null }> {
    try {
      await api.delete(`/users/${userId}`);
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  // APPROVE USER (admin action)
  async approveUser(
    userId: string,
    adminId: string,
  ): Promise<{ error: string | null }> {
    try {
      await api.put(`/users/${userId}/approve`);
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  // REJECT USER (admin action)
  async rejectUser(
    userId: string,
    adminId: string,
    reason: string,
  ): Promise<{ error: string | null }> {
    try {
      await api.put(`/users/${userId}/reject`, { reason });
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  // GET PENDING USERS
  async getPendingUsers(): Promise<{
    users: User[] | null;
    error: string | null;
  }> {
    try {
      const response = await api.get('/users/pending');
      return { users: (response.users as User[]) || [], error: null };
    } catch (error) {
      return { users: null, error: (error as Error).message };
    }
  },
};