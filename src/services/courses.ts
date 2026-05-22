import { Course, CourseMaterial } from "@/types";
import { supabase } from "./supabase";

export const courseService = {
  /**
   * Get all courses (for lecturer to create/manage or admin to view)
   */
  async getAllCourses(): Promise<{
    courses: Course[] | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return { courses: null, error: error.message };
      }

      return { courses: (data as Course[]) || [], error: null };
    } catch (error) {
      return { courses: null, error: (error as Error).message };
    }
  },

  /**
   * Get courses for a specific student
   */
  async getStudentCourses(
    studentId: string,
  ): Promise<{ courses: Course[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("student_id", studentId);

      if (error) {
        return { courses: null, error: error.message };
      }

      const courseIds = data?.map((e) => e.course_id) || [];

      if (courseIds.length === 0) {
        return { courses: [], error: null };
      }

      const { data: courses, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .in("id", courseIds);

      if (courseError) {
        return { courses: null, error: courseError.message };
      }

      return { courses: (courses as Course[]) || [], error: null };
    } catch (error) {
      return { courses: null, error: (error as Error).message };
    }
  },

  /**
   * Get courses for a specific lecturer
   */
  async getLecturerCourses(
    lecturerId: string,
  ): Promise<{ courses: Course[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("lecturer_id", lecturerId)
        .order("created_at", { ascending: false });

      if (error) {
        return { courses: null, error: error.message };
      }

      return { courses: (data as Course[]) || [], error: null };
    } catch (error) {
      return { courses: null, error: (error as Error).message };
    }
  },

  /**
   * Get course by ID
   */
  async getCourseById(
    courseId: string,
  ): Promise<{ course: Course | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (error) {
        return { course: null, error: error.message };
      }

      return { course: (data as Course) || null, error: null };
    } catch (error) {
      return { course: null, error: (error as Error).message };
    }
  },

  /**
   * Create a new course (lecturer/admin)
   */
  async createCourse(
    courseData: Omit<Course, "id" | "created_at">,
  ): Promise<{ course: Course | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          ...courseData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { course: null, error: error.message };
      }

      return { course: (data as Course) || null, error: null };
    } catch (error) {
      return { course: null, error: (error as Error).message };
    }
  },

  /**
   * Update course
   */
  async updateCourse(
    courseId: string,
    updates: Partial<Course>,
  ): Promise<{ course: Course | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", courseId)
        .select()
        .single();

      if (error) {
        return { course: null, error: error.message };
      }

      return { course: (data as Course) || null, error: null };
    } catch (error) {
      return { course: null, error: (error as Error).message };
    }
  },

  /**
   * Delete course
   */
  async deleteCourse(courseId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Enroll student in course
   */
  async enrollStudent(
    studentId: string,
    courseId: string,
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.from("course_enrollments").insert({
        student_id: studentId,
        course_id: courseId,
        enrolled_at: new Date().toISOString(),
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },

  /**
   * Get course materials
   */
  async getCourseMaterials(
    courseId: string,
  ): Promise<{ materials: CourseMaterial[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("course_materials")
        .select("*")
        .eq("course_id", courseId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        return { materials: null, error: error.message };
      }

      return { materials: (data as CourseMaterial[]) || [], error: null };
    } catch (error) {
      return { materials: null, error: (error as Error).message };
    }
  },

  /**
   * Upload course material
   */
  async uploadMaterial(
    courseId: string,
    materialData: Omit<CourseMaterial, "id" | "uploaded_at">,
  ): Promise<{ material: CourseMaterial | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("course_materials")
        .insert({
          ...materialData,
          course_id: courseId,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { material: null, error: error.message };
      }

      return { material: (data as CourseMaterial) || null, error: null };
    } catch (error) {
      return { material: null, error: (error as Error).message };
    }
  },

  /**
   * Delete course material
   */
  async deleteMaterial(materialId: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from("course_materials")
        .delete()
        .eq("id", materialId);

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
};
