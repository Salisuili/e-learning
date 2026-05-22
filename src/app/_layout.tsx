import { AuthCheck } from '@/components/auth-check';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}

function RootLayoutContent() {
  const { user, loading } = useAuth();
  const segments = useSegments() as string[];
  const navigationState = useRootNavigationState();
  const router = useRouter();

  useEffect(() => {
    if (!navigationState?.key) return;

    // WAIT FOR AUTH TO FINISH
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isRoot = segments.length === 0 || (segments.length === 1 && segments[0] === 'index') || (segments.length === 1 && segments[0] === '');
    const isPublicRoute = inAuthGroup || isRoot;

    if (!user) {
      // Redirect unauthenticated users trying to access protected routes to login
      if (!isPublicRoute) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // User is logged in
    const role = user.role;
    
    // Check if the user is in the correct group for their role
    const inStudentGroup = segments[0] === '(student)';
    const inLecturerGroup = segments[0] === '(lecturer)';
    const inAdminGroup = segments[0] === '(admin)';

    if (isPublicRoute) {
      // Redirect logged-in users away from public pages to their dashboard
      if (role === 'student') {
        router.replace('/(student)/dashboard');
      } else if (role === 'lecturer') {
        router.replace('/(lecturer)/dashboard');
      } else if (role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(auth)/login');
      }
    } else {
      // If user is on a protected route but in the wrong group, redirect to their correct dashboard
      if (role === 'student' && !inStudentGroup) {
        router.replace('/(student)/dashboard');
      } else if (role === 'lecturer' && !inLecturerGroup) {
        router.replace('/(lecturer)/dashboard');
      } else if (role === 'admin' && !inAdminGroup) {
        router.replace('/(admin)/dashboard');
      }
    }
  }, [user, loading, navigationState?.key, segments]);

  return (
    <AuthCheck>
      <SafeAreaView style={styles.safeArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
    </AuthCheck>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
