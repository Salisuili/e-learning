import { Assignment, AssignmentSubmission } from "@/types";
import { api } from "./supabase";

export const assignmentService = {
  /**
   * Get assignments for a course
   */
  async getCourseAssignments(
    courseId: string,
  ): Promise<{ assignments: Assignment[] | null; error: string | null }> {
    try {
      const response = await api.get(`/assignments/course/${courseId}`);
      return { assignments: (response.assignments as Assignment[]) || [], error: null };
    } catch (error) {
      return { assignments: null, error: (error as Error).message };
    }
  },

  /**
   * Get assignment by ID
   */
  async getAssignmentById(
    assignmentId: string,
  ): Promise<{ assignment: Assignment | null; error: string | null }> {
    try {
      const response = await api.get(`/assignments/${assignmentId}`);
      return { assignment: (response.assignment as Assignment) || null, error: null };
    } catch (error) {
      return { assignment: null, error: (error as Error).message };
    }
  },

  /**
   * Create assignment (lecturer)
   */
  async createAssignment(
    courseId: string,
    assignmentData: Omit<Assignment, "id" | "created_at" | "course_id">,
  ): Promise<{ assignment: Assignment | null; error: string | null }> {
    try {
      const formData = new FormData();
      formData.append('title', assignmentData.title);
      formData.append('description', assignmentData.description || '');
      formData.append('due_date', assignmentData.due_date);
      formData.append('max_score', String(assignmentData.max_score));
      // If there's a file to upload
      if ((assignmentData as any).assignment_file) {
        formData.append('assignment_file', (assignmentData as any).assignment_file);
      }
      const response = await api.upload('POST', `/assignments/course/${courseId}`, formData);
      return { assignment: (response.assignment as Assignment) || null, error: null };
    } catch (error) {
      return { assignment: null, error: (error as Error).message };
    }
  },

  /**
   * Update assignment
   */
  async updateAssignment(
    assignmentId: string,
    updates: Partial<Assignment>,
  ): Promise<{ assignment: Assignment | null; error: string | null }> {
    try {
      const response = await api.put(`/assignments/${assignmentId}`, updates);
      return { assignment: (response.assignment as Assignment) || null, error: null };
    } catch (error) {
      return { assignment: null, error: (error as Error).message };
    }
  },

  /**
   * Delete assignment
   */
  async deleteAssignment(
    assignmentId: string,
  ): Promise<{ error: string | null }> {
    try {
      await api.delete(`/assignments/${assignmentId}`);
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Submit assignment
   */
  async submitAssignment(
    assignmentId: string,
    studentId: string,
    submissionData: {
      submission_text?: string;
      submission_file?: { name: string; uri: string; mimeType?: string };
    },
  ): Promise<{
    submission: AssignmentSubmission | null;
    error: string | null;
  }> {
    try {
      const formData = new FormData();
      formData.append('submission_text', submissionData.submission_text || '');
      if (submissionData.submission_file) {
        formData.append('submission', {
          uri: submissionData.submission_file.uri,
          name: submissionData.submission_file.name,
          type: submissionData.submission_file.mimeType || 'application/octet-stream',
        } as any);
      }
      const response = await api.upload('POST', `/assignments/${assignmentId}/submit`, formData);
      return { submission: (response.submission as AssignmentSubmission) || null, error: null };
    } catch (error) {
      return { submission: null, error: (error as Error).message };
    }
  },

  /**
   * Get student submissions for assignment
   */
  async getAssignmentSubmissions(
    assignmentId: string,
  ): Promise<{
    submissions: AssignmentSubmission[] | null;
    error: string | null;
  }> {
    try {
      const response = await api.get(`/assignments/${assignmentId}/submissions`);
      return { submissions: (response.submissions as AssignmentSubmission[]) || [], error: null };
    } catch (error) {
      return { submissions: null, error: (error as Error).message };
    }
  },

  /**
   * Get student's submission for assignment
   */
  async getStudentSubmission(
    assignmentId: string,
    studentId: string,
  ): Promise<{
    submission: AssignmentSubmission | null;
    error: string | null;
  }> {
    try {
      const response = await api.get(`/assignments/${assignmentId}/my-submission`);
      return { submission: (response.submission as AssignmentSubmission) || null, error: null };
    } catch (error) {
      return { submission: null, error: (error as Error).message };
    }
  },

  /**
   * Grade submission
   */
  async gradeSubmission(
    submissionId: string,
    score: number,
    feedback: string,
  ): Promise<{
    submission: AssignmentSubmission | null;
    error: string | null;
  }> {
    try {
      const response = await api.put(`/assignments/submissions/${submissionId}/grade`, { score, feedback });
      return { submission: (response.submission as AssignmentSubmission) || null, error: null };
    } catch (error) {
      return { submission: null, error: (error as Error).message };
    }
  },
};