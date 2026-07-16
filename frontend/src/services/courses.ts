import { Course, CourseMaterial } from "@/types";
import { api } from "./supabase";

export const courseService = {
  /**
   * Get all courses
   */
  async getAllCourses(): Promise<{
    courses: Course[] | null;
    error: string | null;
  }> {
    try {
      const response = await api.get('/courses');
      return { courses: (response.courses as Course[]) || [], error: null };
    } catch (error) {
      return { courses: null, error: (error as Error).message };
    }
  },

  /**
   * Get available courses for students to browse (with level/department filtering)
   */
  async getAvailableCourses(
    level?: string,
    department?: string,
  ): Promise<{ courses: Course[] | null; error: string | null }> {
    try {
      let endpoint = '/courses/available';
      const params: string[] = [];
      if (level) params.push(`level=${encodeURIComponent(level)}`);
      if (department) params.push(`department=${encodeURIComponent(department)}`);
      if (params.length > 0) endpoint += '?' + params.join('&');
      const response = await api.get(endpoint);
      return { courses: (response.courses as Course[]) || [], error: null };
    } catch (error) {
      return { courses: null, error: (error as Error).message };
    }
  },

  /**
   * Get distinct levels
   */
  async getLevels(): Promise<{ levels: string[] | null; error: string | null }> {
    try {
      const response = await api.get('/courses/levels');
      return { levels: (response.levels as string[]) || [], error: null };
    } catch (error) {
      return { levels: null, error: (error as Error).message };
    }
  },

  /**
   * Get distinct sessions
   */
  async getSessions(): Promise<{ sessions: string[] | null; error: string | null }> {
    try {
      const response = await api.get('/courses/sessions');
      return { sessions: (response.sessions as string[]) || [], error: null };
    } catch (error) {
      return { sessions: null, error: (error as Error).message };
    }
  },

  /**
   * Get courses for a specific student
   */
  async getStudentCourses(
    studentId: string,
  ): Promise<{ courses: Course[] | null; error: string | null }> {
    try {
      const response = await api.get('/courses');
      return { courses: (response.courses as Course[]) || [], error: null };
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
      const response = await api.get('/courses');
      return { courses: (response.courses as Course[]) || [], error: null };
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
      const response = await api.get(`/courses/${courseId}`);
      return { course: (response.course as Course) || null, error: null };
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
      const response = await api.post('/courses', courseData);
      return { course: (response.course as Course) || null, error: null };
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
      const response = await api.put(`/courses/${courseId}`, updates);
      return { course: (response.course as Course) || null, error: null };
    } catch (error) {
      return { course: null, error: (error as Error).message };
    }
  },

  /**
   * Delete course
   */
  async deleteCourse(courseId: string): Promise<{ error: string | null }> {
    try {
      await api.delete(`/courses/${courseId}`);
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
      await api.post(`/courses/${courseId}/enroll`);
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
      const response = await api.get(`/courses/${courseId}/materials`);
      return { materials: (response.materials as CourseMaterial[]) || [], error: null };
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
      const formData = new FormData();
      formData.append('title', materialData.title);
      formData.append('description', materialData.description || '');
      if (materialData.file_url) {
        formData.append('material', {
          uri: materialData.file_url,
          name: materialData.file_name,
          type: materialData.file_type,
        } as any);
      }
      const response = await api.upload('POST', `/courses/${courseId}/materials`, formData);
      return { material: (response.material as CourseMaterial) || null, error: null };
    } catch (error) {
      return { material: null, error: (error as Error).message };
    }
  },

  /**
   * Delete course material
   */
  async deleteMaterial(materialId: string): Promise<{ error: string | null }> {
    try {
      await api.delete(`/courses/materials/${materialId}`);
      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  },
};