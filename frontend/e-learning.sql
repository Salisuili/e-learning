-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL,
  email character varying NOT NULL UNIQUE,
  full_name character varying NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['student'::character varying, 'lecturer'::character varying, 'admin'::character varying]::text[])),
  department character varying NOT NULL,
  avatar_url character varying,
  created_at timestamp without time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  updated_at timestamp without time zone DEFAULT now(),
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  is_approved boolean DEFAULT false,
  identification_number character varying,
  document_url character varying,
  document_file_name character varying,
  reviewed_by uuid,
  reviewed_at timestamp without time zone,
  rejection_reason text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  title character varying NOT NULL,
  description text,
  department character varying NOT NULL,
  lecturer_id uuid NOT NULL,
  credits integer DEFAULT 3,
  semester character varying,
  year integer,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id)
);
CREATE TABLE public.course_enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  enrolled_at timestamp without time zone DEFAULT now(),
  grade character varying,
  CONSTRAINT course_enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT course_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id),
  CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  file_url character varying NOT NULL,
  file_name character varying NOT NULL,
  file_size integer,
  file_type character varying,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT course_materials_pkey PRIMARY KEY (id),
  CONSTRAINT course_materials_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_materials_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  due_date timestamp without time zone NOT NULL,
  max_score integer DEFAULT 100,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  assignment_file_url character varying,
  assignment_file_name character varying,
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.assignment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  submission_file_url character varying,
  submission_file_name character varying,
  submission_text text,
  submitted_at timestamp without time zone DEFAULT now(),
  score integer,
  feedback text,
  graded_at timestamp without time zone,
  status character varying DEFAULT 'submitted'::character varying CHECK (status::text = ANY (ARRAY['submitted'::character varying, 'late'::character varying, 'graded'::character varying]::text[])),
  CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id),
  CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id)
);
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid,
  department character varying,
  title character varying NOT NULL,
  content text NOT NULL,
  posted_by uuid,
  posted_at timestamp without time zone DEFAULT now(),
  priority character varying DEFAULT 'medium'::character varying CHECK (priority::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying]::text[])),
  is_pinned boolean DEFAULT false,
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT announcements_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id)
);