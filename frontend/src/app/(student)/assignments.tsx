import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { assignmentService } from '@/services/assignments';
import { courseService } from '@/services/courses';
import { Assignment, AssignmentSubmission, Course } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function StudentAssignments() {
  const { user } = useAuth();
  const theme = useTheme();

  const [assignments, setAssignments] = useState<(Assignment & { course?: Course })[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, AssignmentSubmission>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Submit modal
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<(Assignment & { course?: Course }) | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<{ name: string; uri: string; mimeType?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadAssignments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setMessage(null);

    try {
      // Get all courses the student is enrolled in
      const { courses } = await courseService.getStudentCourses(user.id);
      const allAssignments: (Assignment & { course?: Course })[] = [];
      const subMap: Record<string, AssignmentSubmission> = {};

      if (courses) {
        for (const course of courses) {
          const { assignments: courseAssignments } = await assignmentService.getCourseAssignments(course.id);
          if (courseAssignments) {
            for (const assignment of courseAssignments) {
              allAssignments.push({ ...assignment, course });

              // Get submission status
              const { submission } = await assignmentService.getStudentSubmission(assignment.id, user.id);
              if (submission) {
                subMap[assignment.id] = submission;
              }
            }
          }
        }
      }

      // Sort by due date (soonest first)
      allAssignments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      setAssignments(allAssignments);
      setSubmissions(subMap);
    } catch (err) {
      setMessage('Failed to load assignments');
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  };

  const openSubmitModal = (assignment: Assignment & { course?: Course }) => {
    setSelectedAssignment(assignment);
    setSubmissionText('');
    setSubmissionFile(null);
    setSubmitModalVisible(true);
  };

  const pickSubmissionFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/zip'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSubmissionFile({ name: file.name, uri: file.uri, mimeType: file.mimeType || undefined });
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !user?.id) return;
    if (!submissionText.trim() && !submissionFile) {
      Alert.alert('Error', 'Please enter your submission text or upload a file');
      return;
    }

    setSubmitting(true);
    const { submission, error } = await assignmentService.submitAssignment(
      selectedAssignment.id,
      user.id,
      { submission_text: submissionText.trim(), submission_file: submissionFile || undefined }
    );

    if (error) {
      Alert.alert('Error', error);
    } else if (submission) {
      setSubmissions((prev) => ({ ...prev, [selectedAssignment.id]: submission }));
      setSubmitModalVisible(false);
      Alert.alert('Success', 'Assignment submitted successfully');
    }
    setSubmitting(false);
  };

  const getStatusColor = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return '#EF4444';
    if (diff <= 2 * 24 * 60 * 60 * 1000) return '#F59E0B';
    return '#10B981';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const pendingCount = assignments.filter((a) => !submissions[a.id]).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>My Assignments</Text>
        <Text style={styles.headerSubtitle}>
          {assignments.length} total · {pendingCount} pending
        </Text>
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
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading assignments...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
        >
          {assignments.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="clipboard-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No assignments</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Assignments from your enrolled courses will appear here.
              </Text>
            </View>
          ) : (
            assignments.map((assignment, index) => {
              const submission = submissions[assignment.id];
              const statusColor = getStatusColor(assignment.due_date);
              const isOverdue = new Date(assignment.due_date).getTime() < Date.now();
              const isSubmitted = !!submission;

              return (
                <Animated.View key={assignment.id} style={{ opacity: fadeAnim }}>
                  <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    {/* Course badge */}
                    {assignment.course && (
                      <View style={[styles.courseBadge, { backgroundColor: theme.primary + '12' }]}>
                        <Text style={[styles.courseBadgeText, { color: theme.primary }]}>
                          {assignment.course.code}
                        </Text>
                      </View>
                    )}

                    {/* Header */}
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
                        {assignment.title}
                      </Text>
                      {isSubmitted && (
                        <View style={[styles.submittedBadge, { backgroundColor: '#10B98120' }]}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={styles.submittedText}>Done</Text>
                        </View>
                      )}
                    </View>

                    {/* Description */}
                    {assignment.description && (
                      <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                        {assignment.description}
                      </Text>
                    )}

                    {/* Meta */}
                    <View style={styles.metaRow}>
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
                          {assignment.max_score} pts
                        </Text>
                      </View>
                    </View>

                    {/* Grade if submitted and graded */}
                    {submission && submission.score !== null && submission.score !== undefined && (
                      <View style={[styles.gradeCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
                        <Ionicons name="ribbon-outline" size={20} color={theme.primary} />
                        <View>
                          <Text style={[styles.gradeScore, { color: theme.primary }]}>
                            {submission.score}/{assignment.max_score}
                          </Text>
                          {submission.feedback && (
                            <Text style={[styles.gradeFeedback, { color: theme.textSecondary }]}>
                              "{submission.feedback}"
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    {/* Action */}
                    {!isSubmitted && !isOverdue && (
                      <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                        onPress={() => openSubmitModal(assignment)}
                      >
                        <Text style={styles.submitBtnText}>Submit Assignment</Text>
                        <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                      </TouchableOpacity>
                    )}

                    {isSubmitted && (
                      <View style={[styles.submittedInfo, { backgroundColor: '#10B98110', borderColor: '#10B98120' }]}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={[styles.submittedInfoText, { color: '#10B981' }]}>
                          Submitted {formatDate(submission.submitted_at)}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Submit Modal */}
      <Modal visible={submitModalVisible} animationType="fade" transparent onRequestClose={() => setSubmitModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Submit Assignment</Text>
              <TouchableOpacity onPress={() => setSubmitModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            {selectedAssignment && (
              <>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {selectedAssignment.title}
                  {selectedAssignment.course && ` — ${selectedAssignment.course.code}`}
                </Text>
                <Text style={[styles.modalDue, { color: getStatusColor(selectedAssignment.due_date) }]}>
                  Due: {formatDate(selectedAssignment.due_date)}
                </Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                  placeholder="Type your submission..."
                  placeholderTextColor={theme.textSecondary}
                  value={submissionText}
                  onChangeText={setSubmissionText}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                {/* File Upload */}
                <TouchableOpacity
                  style={[styles.filePickBtn, { borderColor: theme.border, backgroundColor: submissionFile ? theme.success + '10' : theme.cardBackground }]}
                  onPress={pickSubmissionFile}
                >
                  {submissionFile ? (
                    <>
                      <Ionicons name="document-text-outline" size={22} color={theme.success} />
                      <View style={styles.filePickInfo}>
                        <Text style={[styles.filePickName, { color: theme.text }]} numberOfLines={1}>{submissionFile.name}</Text>
                        <Text style={[styles.filePickStatus, { color: theme.success }]}>File selected</Text>
                      </View>
                      <TouchableOpacity onPress={() => setSubmissionFile(null)}>
                        <Ionicons name="close-circle" size={20} color={theme.error} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={22} color={theme.primary} />
                      <View style={styles.filePickInfo}>
                        <Text style={[styles.filePickName, { color: theme.text }]}>Upload a file (optional)</Text>
                        <Text style={[styles.filePickStatus, { color: theme.textSecondary }]}>PDF, Word, Image, ZIP</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: theme.primary, opacity: submitting ? 0.6 : 1 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                      <Text style={styles.modalSubmitText}>Submit</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  messageBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  messageText: { flex: 1, fontSize: 13, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  emptyCard: { padding: 40, borderRadius: 18, borderWidth: 1, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  courseBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  courseBadgeText: { fontSize: 11, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  submittedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 3 },
  submittedText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  cardDesc: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  gradeCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10, gap: 10 },
  gradeScore: { fontSize: 18, fontWeight: '800' },
  gradeFeedback: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  submittedInfo: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, gap: 6 },
  submittedInfoText: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  modalContent: { width: '100%', borderRadius: 20, padding: 24, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 14, marginBottom: 4 },
  modalDue: { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 120, marginBottom: 16 },
  filePickBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 14, marginBottom: 16, gap: 12 },
  filePickInfo: { flex: 1 },
  filePickName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  filePickStatus: { fontSize: 12 },
  modalSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});