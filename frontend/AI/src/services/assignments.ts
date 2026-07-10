import { Assignment, AssignmentSubmission } from "@/types";
import { supabase } from "./supabase";

export const assignmentService = {
  /**
   * Get assignments for a course
   */
  async getCourseAssignments(
    courseId: string,
  ): Promise<{ assignments: Assignment[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("course_id", courseId)
        .order("due_date", { ascending: true });

      if (error) {
        return { assignments: null, error: error.message };
      }

      return { assignments: (data as Assignment[]) || [], error: null };
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
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", assignmentId)
        .single();

      if (error) {
        return { assignment: null, error: error.message };
      }

      return { assignment: (data as Assignment) || null, error: null };
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
      const { data, error } = await supabase
        .from("assignments")
        .insert({
          ...assignmentData,
          course_id: courseId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { assignment: null, error: error.message };
      }

      return { assignment: (data as Assignment) || null, error: null };
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
      const { data, error } = await supabase
        .from("assignments")
        .update(updates)
        .eq("id", assignmentId)
        .select()
        .single();

      if (error) {
        return { assignment: null, error: error.message };
      }

      return { assignment: (data as Assignment) || null, error: null };
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
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) {
        return { error: error.message };
      }

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
    submissionData: Omit<
      AssignmentSubmission,
      "id" | "submitted_at" | "assignment_id" | "student_id"
    >,
  ): Promise<{
    submission: AssignmentSubmission | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .insert({
          ...submissionData,
          assignment_id: assignmentId,
          student_id: studentId,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { submission: null, error: error.message };
      }

      return {
        submission: (data as AssignmentSubmission) || null,
        error: null,
      };
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
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("submitted_at", { ascending: false });

      if (error) {
        return { submissions: null, error: error.message };
      }

      return {
        submissions: (data as AssignmentSubmission[]) || [],
        error: null,
      };
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
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", studentId)
        .single();

      if (error && error.code !== "PGRST116") {
        return { submission: null, error: error.message };
      }

      return {
        submission: (data as AssignmentSubmission) || null,
        error: null,
      };
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
      const { data, error } = await supabase
        .from("assignment_submissions")
        .update({
          score,
          feedback,
          graded_at: new Date().toISOString(),
        })
        .eq("id", submissionId)
        .select()
        .single();

      if (error) {
        return { submission: null, error: error.message };
      }

      return {
        submission: (data as AssignmentSubmission) || null,
        error: null,
      };
    } catch (error) {
      return { submission: null, error: (error as Error).message };
    }
  },
};
