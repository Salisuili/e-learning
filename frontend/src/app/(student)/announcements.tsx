import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { announcementService } from '@/services/announcements';
import { courseService } from '@/services/courses';
import { Announcement } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function StudentAnnouncements() {
  const { user } = useAuth();
  const theme = useTheme();

  const [announcements, setAnnouncements] = useState<(Announcement & { course_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadAnnouncements = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { announcements: data, error } = await announcementService.getMyFeed();
      if (error) {
        console.error('Failed to load announcements:', error);
        setAnnouncements([]);
      } else {
        // Attach course names if available from enrolled courses
        const { courses } = await courseService.getStudentCourses(user.id);
        const courseMap: Record<string, string> = {};
        if (courses) {
          courses.forEach(c => { courseMap[c.id] = c.title; });
        }

        const mapped = (data || []).map(ann => ({
          ...ann,
          course_name: ann.course_id ? (courseMap[ann.course_id] || 'Course') : 'General',
        }));

        // Sort: pinned first, then by date
        mapped.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
        });

        setAnnouncements(mapped);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#F59E0B';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Announcements</Text>
        <Text style={styles.headerSubtitle}>
          {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading announcements...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
        >
          {announcements.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="megaphone-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No announcements</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Announcements from your courses will appear here.
              </Text>
            </View>
          ) : (
            announcements.map((announcement) => {
              const isExpanded = expandedId === announcement.id;
              const priorityColor = getPriorityColor(announcement.priority);

              return (
                <Animated.View key={announcement.id} style={{ opacity: fadeAnim }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setExpandedId(isExpanded ? null : announcement.id)}
                    style={[styles.card, {
                      backgroundColor: theme.cardBackground,
                      borderColor: announcement.is_pinned ? priorityColor + '40' : theme.border,
                    }]}
                  >
                    {/* Top Row */}
                    <View style={styles.cardTop}>
                      <View style={[styles.iconContainer, { backgroundColor: priorityColor + '15' }]}>
                        <Ionicons
                          name={announcement.is_pinned ? 'pin' : 'megaphone-outline'}
                          size={20}
                          color={priorityColor}
                        />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={isExpanded ? undefined : 1}>
                          {announcement.title}
                        </Text>
                        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                          {announcement.course_name && `${announcement.course_name} · `}
                          {formatDate(announcement.posted_at)}
                        </Text>
                      </View>
                      {announcement.is_pinned && (
                        <View style={[styles.pinBadge, { backgroundColor: priorityColor + '15' }]}>
                          <Text style={[styles.pinText, { color: priorityColor }]}>Pinned</Text>
                        </View>
                      )}
                    </View>

                    {/* Content */}
                    <Text
                      style={[styles.cardContent, { color: theme.textSecondary }]}
                      numberOfLines={isExpanded ? undefined : 3}
                    >
                      {announcement.content}
                    </Text>

                    {!isExpanded && announcement.content.length > 150 && (
                      <Text style={[styles.readMore, { color: theme.primary }]}>Read more</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  emptyCard: { padding: 40, borderRadius: 18, borderWidth: 1, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', marginBottom: 10 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardMeta: { fontSize: 12, fontWeight: '500' },
  pinBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  pinText: { fontSize: 11, fontWeight: '700' },
  cardContent: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  readMore: { fontSize: 13, fontWeight: '600', marginTop: 6 },
});