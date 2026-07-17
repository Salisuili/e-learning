import { Announcement } from "@/types";
import { api } from "./supabase";

export const announcementService = {
  /**
   * Get all announcements (admin/lecturer)
   */
  async getAllAnnouncements(): Promise<{ announcements: Announcement[] | null; error: string | null }> {
    try {
      const response = await api.get('/announcements');
      return { announcements: (response.announcements as Announcement[]) || [], error: null };
    } catch (error) {
      return { announcements: null, error: (error as Error).message };
    }
  },

  /**
   * Get announcements for the current user's feed (course + system-wide)
   */
  async getMyFeed(): Promise<{ announcements: Announcement[] | null; error: string | null }> {
    try {
      const response = await api.get('/announcements/my-feed');
      return { announcements: (response.announcements as Announcement[]) || [], error: null };
    } catch (error) {
      return { announcements: null, error: (error as Error).message };
    }
  },

  /**
   * Get announcements for all courses the lecturer teaches
   */
  async getLecturerCourseAnnouncements(
  ): Promise<{ announcements: Announcement[] | null; error: string | null }> {
    try {
      const response = await api.get('/announcements/lecturer/my-courses');
      return { announcements: (response.announcements as Announcement[]) || [], error: null };
    } catch (error) {
      return { announcements: null, error: (error as Error).message };
    }
  },

  /**
   * Get announcements for a course
   */
  async getCourseAnnouncements(
    courseId: string,
  ): Promise<{ announcements: Announcement[] | null; error: string | null }> {
    try {
      const response = await api.get(`/announcements/course/${courseId}`);
      return { announcements: (response.announcements as Announcement[]) || [], error: null };
    } catch (error) {
      return { announcements: null, error: (error as Error).message };
    }
  },

  /**
   * Get department announcements
   */
  async getDepartmentAnnouncements(
    department: string,
  ): Promise<{ announcements: Announcement[] | null; error: string | null }> {
    try {
      const response = await api.get(`/announcements/department/${department}`);
      return { announcements: (response.announcements as Announcement[]) || [], error: null };
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
      const response = await api.post('/announcements', announcementData);
      return { announcement: (response.announcement as Announcement) || null, error: null };
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
      const response = await api.put(`/announcements/${announcementId}`, updates);
      return { announcement: (response.announcement as Announcement) || null, error: null };
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
      await api.delete(`/announcements/${announcementId}`);
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
      await api.put(`/announcements/${announcementId}/pin`, { is_pinned: isPinned });
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
};