import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { assignmentService } from '@/services/assignments';
import { courseService } from '@/services/courses';
import { getFileUrl } from '@/services/supabase';
import { Assignment, AssignmentSubmission, Course, CourseMaterial } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking } from 'react-native';  
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type TabType = 'materials' | 'assignments';

export default function StudentCourseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, AssignmentSubmission>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('materials');
  const [message, setMessage] = useState<string | null>(null);

  // Download state
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMessage(null);

    try {
      const { course: courseData } = await courseService.getCourseById(id);
      setCourse(courseData);

      const [materialsRes, assignmentsRes] = await Promise.all([
        courseService.getCourseMaterials(id),
        assignmentService.getCourseAssignments(id),
      ]);

      if (materialsRes.error) setMessage(materialsRes.error);
      else setMaterials(materialsRes.materials || []);

      if (assignmentsRes.error) setMessage(assignmentsRes.error);
      else setAssignments(assignmentsRes.assignments || []);

      // Load student's submissions for each assignment
      if (user?.id && assignmentsRes.assignments) {
        const subMap: Record<string, AssignmentSubmission> = {};
        for (const assignment of assignmentsRes.assignments) {
          const { submission } = await assignmentService.getStudentSubmission(assignment.id, user.id);
          if (submission) {
            subMap[assignment.id] = submission;
          }
        }
        setSubmissions(subMap);
      }
    } catch (err) {
      setMessage('Failed to load course data');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const downloadAndOpenFile = async (url: string, fileName: string) => {
    const absoluteUrl = getFileUrl(url);
    if (!absoluteUrl) {
      Alert.alert('Error', 'Invalid file URL');
      return;
    }

    setDownloadingFile(fileName);
    try {
      const canOpen = await Linking.canOpenURL(absoluteUrl);
      if (canOpen) {
        await Linking.openURL(absoluteUrl);
      } else {
        Alert.alert('Error', 'Cannot open this file. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not open the file');
    } finally {
      setDownloadingFile(null);
    }
  };

  const getStatusColor = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const daysLeft = diff / (1000 * 60 * 60 * 24);
    if (diff < 0) return '#EF4444';
    if (daysLeft <= 2) return '#F59E0B';
    return '#10B981';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'document-text-outline';
    if (fileType.includes('image')) return 'image-outline';
    if (fileType.includes('video')) return 'videocam-outline';
    if (fileType.includes('audio')) return 'musical-notes-outline';
    if (fileType.includes('zip') || fileType.includes('rar')) return 'archive-outline';
    return 'document-outline';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading course...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.error} />
        <Text style={[styles.errorTitle, { color: theme.text }]}>Course not found</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get only submitted assignments
  const submittedAssignments = assignments.filter(assignment => submissions[assignment.id]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerCode}>{course.code}</Text>
          <Text style={styles.headerTitle} numberOfLines={2}>{course.title}</Text>
          <Text style={styles.headerMeta}>
            {course.semester} {course.year} | {course.credits} Credits
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
      {(['materials', 'assignments'] as TabType[]).map((tab) => {
        const isActive = activeTab === tab;
        const count = tab === 'materials' ? materials.length : submittedAssignments.length;
        // Add this: determine the display label
        const label = tab === 'materials' ? 'Materials' : 'Submitted Assignments';
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, isActive && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: isActive ? theme.primary : theme.textSecondary }]}>
              {label}
            </Text>
            <View style={[styles.tabCount, { backgroundColor: isActive ? theme.primary + '20' : theme.backgroundElement }]}>
              <Text style={[styles.tabCountText, { color: isActive ? theme.primary : theme.textSecondary }]}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      </View>

      {/* Message */}
      {message && (
        <View style={[styles.messageBar, { backgroundColor: theme.error + '20', borderColor: theme.error + '40' }]}>
          <Ionicons name="alert-circle" size={18} color={theme.error} />
          <Text style={[styles.messageText, { color: theme.error }]}>{message}</Text>
          <TouchableOpacity onPress={() => setMessage(null)}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
      >
        {activeTab === 'materials' ? (
          <>
            {/* Course Info Card */}
            <View style={[styles.infoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Description</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {course.description || 'No description provided.'}
              </Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Department</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{course.department}</Text>
            </View>

            {/* Materials */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Course Materials</Text>
            {materials.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="folder-open-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.4 }} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No materials yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Course materials will appear here once uploaded by your lecturer.
                </Text>
              </View>
            ) : (
              materials.map((material) => (
                <Animated.View key={material.id} style={{ opacity: fadeAnim }}>
                  <TouchableOpacity
                    style={[styles.materialCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                    onPress={() => downloadAndOpenFile(material.file_url, material.file_name)}
                    activeOpacity={0.7}
                    disabled={downloadingFile === material.file_name}
                  >
                    <View style={[styles.fileIconContainer, { backgroundColor: theme.primary + '15' }]}>
                      {downloadingFile === material.file_name ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Ionicons name={getFileIcon(material.file_type) as any} size={24} color={theme.primary} />
                      )}
                    </View>
                    <View style={styles.materialInfo}>
                      <Text style={[styles.materialTitle, { color: theme.text }]} numberOfLines={2}>{material.title}</Text>
                      {material.description && (
                        <Text style={[styles.materialDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                          {material.description}
                        </Text>
                      )}
                      <View style={styles.materialMeta}>
                        <Text style={[styles.materialFile, { color: theme.textSecondary }]}>{material.file_name}</Text>
                        {material.file_size > 0 && (
                          <Text style={[styles.materialSize, { color: theme.textSecondary }]}>
                            {formatFileSize(material.file_size)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="download-outline" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </Animated.View>
              ))
            )}
          </>
        ) : (
          <>
            {/* Assignments - Only show submitted ones */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Submitted Assignments</Text>
            {submittedAssignments.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="clipboard-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.4 }} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No submitted assignments</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  You haven't submitted any assignments for this course yet.
                </Text>
              </View>
            ) : (
              submittedAssignments.map((assignment) => {
                const submission = submissions[assignment.id];
                const statusColor = getStatusColor(assignment.due_date);
                const isOverdue = new Date(assignment.due_date).getTime() < Date.now();

                return (
                  <Animated.View key={assignment.id} style={{ opacity: fadeAnim }}>
                    <View style={[styles.assignmentCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                      <View style={[styles.statusBar, { backgroundColor: '#10B981' }]} />

                      <View style={styles.assignmentContent}>
                        <View style={styles.assignmentHeader}>
                          <Text style={[styles.assignmentTitle, { color: theme.text }]} numberOfLines={2}>
                            {assignment.title}
                          </Text>
                          <View style={[styles.submittedBadge, { backgroundColor: '#10B98120' }]}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.submittedText}>Submitted</Text>
                          </View>
                        </View>

                        {assignment.description && (
                          <Text style={[styles.assignmentDesc, { color: theme.textSecondary }]} numberOfLines={3}>
                            {assignment.description}
                          </Text>
                        )}

                        <View style={styles.assignmentMeta}>
                          <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={14} color={statusColor} />
                            <Text style={[styles.metaText, { color: statusColor }]}>
                              {isOverdue ? 'Overdue: ' : 'Due: '}
                              {formatDate(assignment.due_date)}
                            </Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="star-outline" size={14} color={theme.textSecondary} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                              Max: {assignment.max_score} pts
                            </Text>
                          </View>
                        </View>

                        {submission && submission.score !== null && submission.score !== undefined && (
                          <View style={[styles.gradeCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
                            <Ionicons name="ribbon-outline" size={18} color={theme.primary} />
                            <View style={styles.gradeInfo}>
                              <Text style={[styles.gradeLabel, { color: theme.textSecondary }]}>Grade</Text>
                              <Text style={[styles.gradeValue, { color: theme.primary }]}>
                                {submission.score}/{assignment.max_score}
                              </Text>
                            </View>
                            {submission.feedback && (
                              <Text style={[styles.gradeFeedback, { color: theme.textSecondary }]} numberOfLines={2}>
                                "{submission.feedback}"
                              </Text>
                            )}
                          </View>
                        )}

                        <View style={[styles.submittedInfo, { backgroundColor: '#10B98110', borderColor: '#10B98120' }]}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          <Text style={[styles.submittedInfoText, { color: '#10B981' }]}>
                            Submitted on {formatDate(submission.submitted_at)}
                          </Text>
                        </View>

                        {submission?.submission_file_url && (
                          <TouchableOpacity
                            style={[styles.viewFileBtn, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}
                            onPress={() => downloadAndOpenFile(submission.submission_file_url!, submission.submission_file_name || 'submission')}
                            disabled={downloadingFile === (submission.submission_file_name || 'submission')}
                          >
                            <Ionicons name="document-outline" size={16} color={theme.primary} />
                            <Text style={[styles.viewFileText, { color: theme.primary }]}>
                              {downloadingFile === (submission.submission_file_name || 'submission') ? 'Opening...' : 'View Submitted File'}
                            </Text>
                            <Ionicons name="download-outline" size={16} color={theme.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, marginBottom: 16 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 16 },
  headerBack: { marginBottom: 12 },
  headerContent: {},
  headerCode: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 4, letterSpacing: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerMeta: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tabCountText: { fontSize: 11, fontWeight: '700' },
  messageBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  messageText: { flex: 1, fontSize: 13, fontWeight: '500' },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  infoCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  divider: { height: 1, marginVertical: 10, opacity: 0.5 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  emptyCard: { padding: 32, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  materialCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  fileIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  materialInfo: { flex: 1 },
  materialTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  materialDesc: { fontSize: 12, marginBottom: 4 },
  materialMeta: { flexDirection: 'row', gap: 8 },
  materialFile: { fontSize: 11, fontWeight: '500' },
  materialSize: { fontSize: 11, fontWeight: '500' },
  assignmentCard: { borderRadius: 14, borderWidth: 1, marginBottom: 14, overflow: 'hidden', flexDirection: 'row' },
  statusBar: { width: 4 },
  assignmentContent: { flex: 1, padding: 14 },
  assignmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  assignmentTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  submittedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 },
  submittedText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  assignmentDesc: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  assignmentMeta: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  gradeCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10, gap: 10 },
  gradeInfo: { flex: 1 },
  gradeLabel: { fontSize: 11, fontWeight: '500' },
  gradeValue: { fontSize: 16, fontWeight: '800' },
  gradeFeedback: { fontSize: 12, fontStyle: 'italic', flex: 1 },
  submittedInfo: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, gap: 6 },
  submittedInfoText: { fontSize: 12, fontWeight: '600' },
  viewFileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 6, marginTop: 8 },
  viewFileText: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'center' },
});