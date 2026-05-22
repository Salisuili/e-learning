import { User, UserRole } from "@/types";
import { supabase } from "./supabase";

export const userService = {
  // GET ALL USERS
  async getAllUsers(): Promise<{ users: User[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return { users: null, error: error.message };
      }

      return { users: (data as User[]) || [], error: null };
    } catch (error) {
      console.log("[DEBUG] exception:", error);
      return { users: null, error: (error as Error).message };
    }
  },

  // UPDATE USER ROLE
  async updateUserRole(
    userId: string,
    role: UserRole,
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ role })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        return { user: null, error: error.message };
      }

      return { user: data as User, error: null };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  },

  // GET USERS BY ROLE
  async getUsersByRole(
    role: UserRole,
  ): Promise<{ users: User[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", role)
        .order("created_at", { ascending: false });

      if (error) {
        return { users: null, error: error.message };
      }

      return { users: (data as User[]) || [], error: null };
    } catch (error) {
      return { users: null, error: (error as Error).message };
    }
  },

  // DELETE USER
  async deleteUser(userId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
};
