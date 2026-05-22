# 📱 Mobile E-Learning and Assignment Management System

A mobile application built with React Native and Supabase for managing academic activities in a department.

## Features

### 🔐 Authentication & Authorization

- Secure login and registration
- Three user roles: Student, Lecturer, Admin
- Password reset functionality
- Role-based routing and access control

### 📚 Course Management

- View available courses (students)
- Create and manage courses (lecturers)
- Upload course materials (PDFs, documents)
- Browse and download learning resources

### 📝 Assignment Management

- Create and distribute assignments (lecturers)
- View assignment details and deadlines (students)
- Submit assignments online (students)
- Grade submissions (lecturers)

### 📢 Announcements

- Post department-wide and course-specific announcements
- Pin important announcements
- Priority levels (low, medium, high)

### 📂 File Management

- Secure cloud storage with Supabase
- Upload and download documents
- File organization by course/user

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: Expo Router with file-based routing
- **Backend**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Language**: TypeScript
- **Styling**: React Native StyleSheet

## Quick Start

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Supabase

- Copy `.env.example` to `.env.local`
- Add your Supabase credentials
- See [SETUP.md](SETUP.md) for complete database schema setup

### 3. Run the App

```bash
npm start
```

Then press:

- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Authentication flows
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (student)/        # Student dashboard
│   │   ├── dashboard.tsx
│   │   ├── assignments.tsx
│   │   ├── announcements.tsx
│   │   └── profile.tsx
│   ├── (lecturer)/       # Lecturer dashboard
│   │   ├── dashboard.tsx
│   │   ├── submissions.tsx
│   │   └── profile.tsx
│   └── (admin)/          # Admin dashboard
│       ├── dashboard.tsx
│       ├── users.tsx
│       └── profile.tsx
├── components/           # Reusable UI components
├── context/
│   └── AuthContext.tsx   # Authentication state management
├── hooks/
│   ├── use-theme.ts
│   └── use-color-scheme.ts
├── services/             # API & Supabase services
│   ├── auth.ts
│   ├── courses.ts
│   ├── assignments.ts
│   ├── announcements.ts
│   ├── storage.ts
│   └── supabase.js
├── types/
│   └── index.ts          # TypeScript interfaces
└── constants/
    └── theme.ts          # Theme configuration
```

## User Types & Features

### 👨‍🎓 Student Dashboard

- View enrolled courses with course details
- Access course materials
- View assignments and deadlines
- Submit assignments
- Track grades
- Read announcements
- View personal profile

### 👨‍🏫 Lecturer Dashboard

- Create and manage courses
- Upload course materials
- Create assignments with deadlines
- View student submissions
- Grade assignments
- Post announcements
- View personal profile

### 👨‍💼 Admin Dashboard

- Manage system users
- Manage courses
- Monitor system activities
- Generate reports
- View personal profile

## Setup Instructions

For detailed setup including database schema and environment configuration, see **[SETUP.md](SETUP.md)**.

## Key Services

### Authentication Service

- User registration and login
- Password reset
- Session management
- Auth state monitoring

### Course Service

- Manage courses and enrollments
- Upload course materials
- Retrieve course data

### Assignment Service

- Create and manage assignments
- Submit and grade assignments
- Track submissions

### Announcement Service

- Post announcements
- Pin/unpin announcements
- Manage announcement priority

### Storage Service

- Upload files to Supabase Storage
- Download files
- Manage file access

## Environment Configuration

Create `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase project:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → API
4. Copy Project URL and anon key

## Scripts

```bash
npm start              # Start Expo development server
npm run web            # Run on web browser
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run lint           # Run ESLint
npm run reset-project  # Reset to blank project
```

## Development Roadmap

- [x] User authentication and role-based routing
- [x] Basic dashboard for all user types
- [x] Type-safe services and context
- [ ] Course details and materials display
- [ ] File upload UI for materials
- [ ] Assignment submission interface
- [ ] Grade viewing and assignment progress
- [ ] Real-time notifications
- [ ] Offline support
- [ ] Admin user management UI
- [ ] Advanced search and filtering
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Push notifications

## Architecture Notes

### State Management

- **Auth State**: Managed via `AuthContext` with Supabase Auth
- **UI State**: Local component state using React hooks
- **Real-time Updates**: Ready for Supabase subscriptions

### Navigation

- Role-based routing using Expo Router groups
- Automatic redirection based on user role
- Seamless transitions between authenticated and unauthenticated screens

### Error Handling

- Service-level error handling with try-catch
- User-friendly error messages
- Error state management in context

## Database Schema

Key tables:

- `users` - User profiles with roles
- `courses` - Course information
- `course_enrollments` - Student enrollments
- `course_materials` - Learning resources
- `assignments` - Assignment details
- `assignment_submissions` - Student submissions
- `announcements` - Course and department announcements

See [SETUP.md](SETUP.md) for complete SQL schema.

## Tested Platforms

- ✅ iOS (Simulator)
- ✅ Android (Emulator)
- ✅ Web (Browser)

## Troubleshooting

**Supabase Connection Error**

- Verify `.env.local` has correct credentials
- Check Supabase project is active
- Ensure tables are created

**Auth Not Working**

- Verify Supabase Auth is enabled
- Check email configuration
- Clear app cache

**Role-Based Routing Issue**

- Verify user role in database
- Check AuthContext is properly wrapped
- Inspect routing logic in `_layout.tsx`

**Build Issues**

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Expo cache: `npx expo prebuild --clean`
- Check Node.js version: 18+

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)
- [React Hooks](https://react.dev/reference/react/hooks)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly on all platforms
4. Submit a pull request

## License

This project is private and confidential.

## Contact & Support

For questions or issues during setup, refer to [SETUP.md](SETUP.md) or reach out to the development team.

---

**Last Updated**: May 2026
**Project Version**: 1.0.0
**Status**: Active Development
