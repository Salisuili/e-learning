import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { courseService } from '@/services/courses';
import { Course } from '@/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LecturerDashboard() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCourses = async () => {
    try {
      if (user?.id) {
        const { courses: data, error } = await courseService.getLecturerCourses(user.id);
        if (!error) {
          setCourses(data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  };

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={[styles.courseCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => {
        router.push({
          pathname: '/course/[id]',
          params: { id: item.id },
        });
      }}
    >
      <View>
        <Text style={[styles.courseCode, { color: theme.primary }]}>{item.code}</Text>
        <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.courseInfo, { color: theme.textSecondary }]}>
          {item.semester} - Year {item.year}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.padding}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.text }]}>Welcome, {user?.full_name}</Text>
          <Text style={[styles.subgreeting, { color: theme.textSecondary }]}>
            Teaching {courses.length} courses
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/create-course')}
        >
          <Text style={styles.createButtonText}>+ Create Course</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Courses</Text>
        
        {courses.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No courses yet. Create a new course to get started.
            </Text>
          </View>
        ) : (
          <FlatList
            data={courses}
            renderItem={renderCourseCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  padding: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subgreeting: {
    fontSize: 14,
  },
  createButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  courseCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseInfo: {
    fontSize: 12,
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  separator: {
    height: 0,
  },
});
