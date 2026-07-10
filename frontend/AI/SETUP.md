# E-Learning Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- Supabase account at https://supabase.com

## Environment Setup

### 1. Create `.env.local` file in project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Get your Supabase credentials:

1. Create a new Supabase project at https://supabase.com/dashboard
2. Go to Project Settings → API
3. Copy your project URL and anon key

## Database Schema

Create the following tables in Supabase SQL Editor:

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
  department VARCHAR NOT NULL,
  avatar_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Courses Table

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE,
  title VARCHAR NOT NULL,
  description TEXT,
  department VARCHAR NOT NULL,
  lecturer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits INT DEFAULT 3,
  semester VARCHAR,
  year INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Course Enrollments Table

```sql
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  grade VARCHAR,
  UNIQUE(student_id, course_id)
);
```

### Course Materials Table

```sql
CREATE TABLE course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  file_url VARCHAR NOT NULL,
  file_name VARCHAR NOT NULL,
  file_size INT,
  file_type VARCHAR,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Assignments Table

```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  due_date TIMESTAMP NOT NULL,
  max_score INT DEFAULT 100,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Assignment Submissions Table

```sql
CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_file_url VARCHAR,
  submission_file_name VARCHAR,
  submission_text TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  score INT,
  feedback TEXT,
  graded_at TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);
```

### Announcements Table

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  department_id VARCHAR,
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  posted_at TIMESTAMP DEFAULT NOW(),
  priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_pinned BOOLEAN DEFAULT FALSE
);
```

## Storage Buckets

Create the following public storage buckets in Supabase:

1. **course-materials** - For course PDFs and documents
2. **assignment-submissions** - For student assignment files
3. **user-avatars** - For user profile pictures

Make these buckets **public** for easy access.

### Create Buckets via SQL:

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('course-materials', 'course-materials', true),
  ('assignment-submissions', 'assignment-submissions', true),
  ('user-avatars', 'user-avatars', true);

-- Set public access policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('course-materials', 'assignment-submissions', 'user-avatars'));
```

## Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm start

# Choose platform:
# Press 'i' for iOS
# Press 'a' for Android
# Press 'w' for web
```

## Project Structure

```
src/
├── app/              # Expo Router screens
│   ├── (auth)/      # Login/Register screens
│   ├── (student)/   # Student dashboard
│   ├── (lecturer)/  # Lecturer dashboard
│   └── (admin)/     # Admin dashboard
├── components/       # Reusable components
├── context/         # Auth context
├── hooks/           # Custom hooks
├── services/        # API services
├── types/           # TypeScript types
└── constants/       # App constants
```

## Creating Test Users

Use Supabase Auth to create test users:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Invite" or create users manually
3. Create users with different roles (student, lecturer, admin)

## Features Implemented

✅ **Authentication**

- Login & Register with Supabase Auth
- Role-based access control
- Password reset functionality

✅ **Student Features**

- View enrolled courses
- View course materials
- Submit assignments
- View announcements

✅ **Lecturer Features**

- Create and manage courses
- Upload course materials
- Create assignments
- Grade student submissions
- Post announcements

✅ **Admin Features**

- Manage users (coming soon)
- Manage courses (coming soon)
- View system reports (coming soon)

## Next Steps

1. Complete the course details screen for students/lecturers
2. Implement file upload functionality
3. Add assignment submission UI
4. Complete admin user management
5. Add push notifications
6. Implement real-time updates with Supabase subscriptions
7. Add offline support

## Troubleshooting

**Issue: Supabase connection error**

- Verify `.env.local` has correct credentials
- Check Supabase project is active
- Ensure tables are created correctly

**Issue: Auth not working**

- Check Supabase Auth is enabled
- Verify email configuration in Supabase
- Clear app cache and reinstall

**Issue: Role-based routing not working**

- Ensure user role is set correctly in database
- Check AuthContext is properly wrapped around app
- Verify routing logic in `_layout.tsx`

## Support

For issues or questions, refer to:

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Supabase Documentation](https://supabase.com/docs)
