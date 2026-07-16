import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { courseService } from '@/services/courses';
import { Course } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StudentDashboard() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      if (user?.id) {
        // Load enrolled courses
        const { courses: enrolled } = await courseService.getStudentCourses(user.id);
        setEnrolledCourses(enrolled || []);

        // Load available courses filtered by user's department
        const { courses: available } = await courseService.getAvailableCourses(selectedLevel || undefined, user.department);
        setAvailableCourses(available || []);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.department, selectedLevel]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setRefreshing(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const { error } = await courseService.enrollStudent(user?.id || '', courseId);
      if (error) {
        console.error('Enrollment error:', error);
      } else {
        // Refresh data
        loadCourses();
      }
    } catch (err) {
      console.error('Enrollment error:', err);
    }
  };

  // Check if student is already enrolled in a course
  const isEnrolled = (courseId: string) => {
    return enrolledCourses.some(c => c.id === courseId);
  };

  const LEVELS = ['100', '200', '300', '400', '500', '600', '700'];

  const renderCourseCard = ({ item }: { item: Course }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={[styles.courseCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.codeBadge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.codeText, { color: theme.primary }]}>{item.code}</Text>
          </View>
        </View>
        <View style={styles.cardCenter}>
          <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={12} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.lecturer_name || 'Lecturer'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>{item.semester} {item.year}</Text>
          </View>
          {item.level && (
            <View style={styles.metaRow}>
              <Ionicons name="layers-outline" size={12} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>Level {item.level}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderAvailableCourseCard = ({ item }: { item: Course }) => {
    const enrolled = isEnrolled(item.id);
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={[styles.availableCard, { backgroundColor: theme.cardBackground, borderColor: enrolled ? theme.success + '40' : theme.border }]}>
          <View style={styles.availableCardContent}>
            <View style={[styles.codeBadge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.codeText, { color: theme.primary }]}>{item.code}</Text>
            </View>
            <View style={styles.cardCenter}>
              <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {item.department} · Level {item.level} · {item.credits} Credits
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.enrollBtn, { backgroundColor: enrolled ? theme.success : theme.primary, opacity: enrolled ? 0.7 : 1 }]}
            onPress={() => !enrolled && handleEnroll(item.id)}
            disabled={enrolled}
          >
            <Ionicons name={enrolled ? 'checkmark-circle' : 'add-circle-outline'} size={16} color="#fff" />
            <Text style={styles.enrollBtnText}>{enrolled ? 'Enrolled' : 'Enroll'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.userName}>{user?.full_name || 'Student'}</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.avatarText}>{getInitials(user?.full_name || 'S')}</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>
          Enrolled in {enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
      >
        <View style={styles.padding}>
          {/* Toggle between enrolled and available */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !showAvailable && { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
              onPress={() => setShowAvailable(false)}
            >
              <Text style={[styles.toggleBtnText, { color: !showAvailable ? theme.primary : theme.textSecondary }]}>
                My Courses ({enrolledCourses.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, showAvailable && { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
              onPress={() => setShowAvailable(true)}
            >
              <Text style={[styles.toggleBtnText, { color: showAvailable ? theme.primary : theme.textSecondary }]}>
                Available ({availableCourses.length})
              </Text>
            </TouchableOpacity>
          </View>

          {!showAvailable ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>My Courses</Text>

              {enrolledCourses.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Ionicons name="book-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.4 }} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No courses yet</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    You haven't been enrolled in any courses yet. Browse available courses below.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={enrolledCourses}
                  renderItem={renderCourseCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                />
              )}
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Courses</Text>

              {/* Level filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelScroll}>
                <TouchableOpacity
                  style={[styles.levelChip, { backgroundColor: !selectedLevel ? theme.primary + '20' : theme.backgroundElement, borderColor: !selectedLevel ? theme.primary : theme.border }]}
                  onPress={() => { setSelectedLevel(''); setLoading(true); }}
                >
                  <Text style={[styles.levelChipText, { color: !selectedLevel ? theme.primary : theme.textSecondary }]}>All</Text>
                </TouchableOpacity>
                {LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.levelChip, { backgroundColor: selectedLevel === lvl ? theme.primary + '20' : theme.backgroundElement, borderColor: selectedLevel === lvl ? theme.primary : theme.border }]}
                    onPress={() => { setSelectedLevel(lvl); setLoading(true); }}
                  >
                    <Text style={[styles.levelChipText, { color: selectedLevel === lvl ? theme.primary : theme.textSecondary }]}>Level {lvl}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {availableCourses.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Ionicons name="search-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.4 }} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No courses available</Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No courses available for your department at this level.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={availableCourses}
                  renderItem={renderAvailableCourseCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                />
              )}
            </>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerText: { flex: 1 },
  greeting: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '400' },
  userName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  scrollView: { flex: 1 },
  padding: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
  toggleBtnText: { fontSize: 13, fontWeight: '700' },
  levelScroll: { maxHeight: 40, marginBottom: 12 },
  levelChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  levelChipText: { fontSize: 12, fontWeight: '600' },
  courseCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  cardLeft: { marginRight: 14 },
  codeBadge: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  codeText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  cardCenter: { flex: 1 },
  courseTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, fontWeight: '500' },
  availableCard: { padding: 16, borderRadius: 16, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  availableCardContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  enrollBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyState: { padding: 40, borderRadius: 18, borderWidth: 1, alignItems: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});