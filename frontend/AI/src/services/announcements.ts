import { Announcement } from "@/types";
import { supabase } from "./supabase";

export const announcementService = {
  /**
   * Get announcements for a course
   */
  async getCourseAnnouncements(
    courseId: string,
  ): Promise<{ announcements: Announcement[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("course_id", courseId)
        .order("is_pinned", { ascending: false })
        .order("posted_at", { ascending: false });

      if (error) {
        return { announcements: null, error: error.message };
      }

      return { announcements: (data as Announcement[]) || [], error: null };
    } catch (error) {
      return { announcements: null, error: (error as Error).message };
    }
  },

  /**
   * Get department announcements
   */
  async getDepartmentAnnouncements(
    departmentId: string,
  ): Promise<{ announcements: Announcement[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("department_id", departmentId)
        .is("course_id", null)
        .order("is_pinned", { ascending: false })
        .order("posted_at", { ascending: false });

      if (error) {
        return { announcements: null, error: error.message };
      }

      return { announcements: (data as Announcement[]) || [], error: null };
    } catch (error) {
      return { announcements: null, error: (error as Error).message };
    }
  },

  /**
   * Create announcement
   */
  async createAnnouncement(
    announcementData: Omit<Announcement, "id" | "posted_at">,
  ): Promise<{ announcement: Announcement | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          ...announcementData,
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { announcement: null, error: error.message };
      }

      return { announcement: (data as Announcement) || null, error: null };
    } catch (error) {
      return { announcement: null, error: (error as Error).message };
    }
  },

  /**
   * Update announcement
   */
  async updateAnnouncement(
    announcementId: string,
    updates: Partial<Announcement>,
  ): Promise<{ announcement: Announcement | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .update(updates)
        .eq("id", announcementId)
        .select()
        .single();

      if (error) {
        return { announcement: null, error: error.message };
      }

      return { announcement: (data as Announcement) || null, error: null };
    } catch (error) {
      return { announcement: null, error: (error as Error).message };
    }
  },

  /**
   * Delete announcement
   */
  async deleteAnnouncement(
    announcementId: string,
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Pin announcement
   */
  async pinAnnouncement(
    announcementId: string,
    isPinned: boolean,
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ is_pinned: isPinned })
        .eq("id", announcementId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
};
