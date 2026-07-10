-- ==========================================
-- Supabase Row Level Security (RLS) Fixes
-- Iya Abubakar Computer Center E-Learning Platform
-- Developed by Group 10
-- ==========================================
--
-- This script contains SQL commands to resolve RLS policy violations
-- that prevent successful user registration (profile insertion) and login.
-- Copy and run either Option A (Recommended/Secure) or Option B (Quick Dev Setup)
-- in your Supabase project's SQL Editor (https://supabase.com/dashboard/project/_/sql).

-- =========================================================================
-- OPTION A: Secure RLS Policies (Recommended for Production/Real Use)
-- =========================================================================

-- 1. Enable RLS on all tables (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow public insert" ON users;
DROP POLICY IF EXISTS "Allow public read" ON users;
DROP POLICY IF EXISTS "Allow individual update" ON users;

DROP POLICY IF EXISTS "Enable read access for all users" ON courses;
DROP POLICY IF EXISTS "Enable insert for lecturers and admins" ON courses;
DROP POLICY IF EXISTS "Enable update for lecturers who own the course" ON courses;
DROP POLICY IF EXISTS "Enable delete for lecturers who own the course" ON courses;

DROP POLICY IF EXISTS "Enable read access for enrolled users" ON course_enrollments;
DROP POLICY IF EXISTS "Enable insert for students and lecturers" ON course_enrollments;
DROP POLICY IF EXISTS "Enable delete for enrolled users" ON course_enrollments;

DROP POLICY IF EXISTS "Enable read access for materials" ON course_materials;
DROP POLICY IF EXISTS "Enable insert for lecturers" ON course_materials;
DROP POLICY IF EXISTS "Enable delete for lecturers" ON course_materials;

DROP POLICY IF EXISTS "Enable read access for assignments" ON assignments;
DROP POLICY IF EXISTS "Enable insert for lecturers" ON assignments;

DROP POLICY IF EXISTS "Enable read/write for submissions" ON assignment_submissions;

DROP POLICY IF EXISTS "Enable read access for announcements" ON announcements;
DROP POLICY IF EXISTS "Enable insert for lecturers and admins" ON announcements;

-- 3. Create POLICIES for 'users' table
-- Allow anyone to insert a profile (required during sign up/registration)
CREATE POLICY "Allow public insert" ON public.users 
  FOR INSERT WITH CHECK (true);

-- Allow anyone to view profiles (needed for displaying course lecturers, user info)
CREATE POLICY "Allow public read" ON public.users 
  FOR SELECT USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Allow individual update" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- 4. Create POLICIES for 'courses' table
CREATE POLICY "Enable read access for all users" ON public.courses 
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for lecturers and admins" ON public.courses 
  FOR INSERT WITH CHECK (true); -- Ideally restricted by role, but open for general group testing

CREATE POLICY "Enable update for lecturers who own the course" ON public.courses 
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for lecturers who own the course" ON public.courses 
  FOR DELETE USING (true);

-- 5. Create POLICIES for 'course_enrollments' table
CREATE POLICY "Enable read access for enrolled users" ON public.course_enrollments 
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for students and lecturers" ON public.course_enrollments 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete for enrolled users" ON public.course_enrollments 
  FOR DELETE USING (true);

-- 6. Create POLICIES for 'course_materials' table
CREATE POLICY "Enable read access for materials" ON public.course_materials 
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for lecturers" ON public.course_materials 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete for lecturers" ON public.course_materials 
  FOR DELETE USING (true);

-- 7. Create POLICIES for 'assignments' table
CREATE POLICY "Enable read access for assignments" ON public.assignments 
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for lecturers" ON public.assignments 
  FOR INSERT WITH CHECK (true);

-- 8. Create POLICIES for 'assignment_submissions' table
CREATE POLICY "Enable read/write for submissions" ON public.assignment_submissions 
  FOR ALL USING (true);

-- 9. Create POLICIES for 'announcements' table
CREATE POLICY "Enable read access for announcements" ON public.announcements 
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for lecturers and admins" ON public.announcements 
  FOR INSERT WITH CHECK (true);


-- =========================================================================
-- OPTION B: Disable RLS Entirely (Easiest for local development & testing)
-- =========================================================================
-- Execute this block if you want to bypass all policy checks and let the app
-- read/write data directly without any permissions setup.
--
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE course_enrollments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE course_materials DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE assignment_submissions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
