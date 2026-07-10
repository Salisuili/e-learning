/**
 * User Types and Enums
 */

export type UserRole = "student" | "lecturer" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  created_at: string;
  avatar_url?: string;
  status?: "pending" | "approved" | "rejected";
  is_approved?: boolean;
  identification_number?: string;
  document_url?: string;
  document_file_name?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

/**
 * Course Types
 */
export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  department: string;
  lecturer_id: string;
  lecturer_name?: string;
  credits: number;
  semester: string;
  year: number;
  created_at: string;
  updated_at?: string;
}

export interface CourseEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  grade?: string;
}

/**
 * Material Types
 */
export interface CourseMaterial {
  id: string;
  course_id: string;
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
  updated_at?: string;
}

/**
 * Assignment Types
 */
export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_file_url?: string;
  submission_file_name?: string;
  submission_text?: string;
  submitted_at: string;
  score?: number;
  feedback?: string;
  graded_at?: string;
}

/**
 * Announcement Types
 */
export interface Announcement {
  id: string;
  course_id?: string;
  department_id?: string;
  title: string;
  content: string;
  posted_by: string;
  posted_at: string;
  priority: "low" | "medium" | "high";
  is_pinned: boolean;
}

/**
 * File Storage Types
 */
export interface FileStorage {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_at: string;
  content_type: string;
}

/**
 * Authentication Types
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  full_name: string;
  role: UserRole;
  department: string;
  identification_number?: string;
  document_url?: string;
  document_file_name?: string;
}
