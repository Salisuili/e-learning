import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { assignmentService } from '@/services/assignments';
import { courseService } from '@/services/courses';
import { Assignment, AssignmentSubmission, Course } from '@/types';
import { Ionicons } from '@expo/vector-icons';
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

type Screen = 'courses' | 'assignments' | 'submissions';

export default function LecturerSubmissions() {
  const { user } = useAuth();
  const theme = useTheme();

  const [screen, setScreen] = useState<Screen>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingGrade, setSubmittingGrade] = useState(false);

  // Grade modal
  const [gradeModal, setGradeModal] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<AssignmentSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadCourses = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { courses: data, error: err } = await courseService.getLecturerCourses(user.id);
      if (err) {
        Alert.alert('Error', err);
        setCourses([]);
      } else {
        setCourses(data || []);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (screen === 'courses') {
      await loadCourses();
    } else if (screen === 'assignments' && selectedCourse) {
      await loadAssignments(selectedCourse);
    } else if (screen === 'submissions' && selectedAssignment) {
      await loadSubmissions(selectedAssignment);
    }
    setRefreshing(false);
  };

  const loadAssignments = async (course: Course) => {
    try {
      setLoading(true);
      setSelectedCourse(course);
      setSelectedAssignment(null);
      setSubmissions([]);
      setScreen('assignments');

      const { assignments: data, error: err } = await assignmentService.getCourseAssignments(course.id);
      if (err) {
        Alert.alert('Error', err);
        setAssignments([]);
      } else {
        setAssignments(data || []);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (assignment: Assignment) => {
    try {
      setLoading(true);
      setSelectedAssignment(assignment);
      setScreen('submissions');

      const { submissions: data, error: err } = await assignmentService.getAssignmentSubmissions(assignment.id);
      if (err) {
        Alert.alert('Error', err);
        setSubmissions([]);
      } else {
        setSubmissions(data || []);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load submissions');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const goBackToCourses = () => {
    setScreen('courses');
    setSelectedCourse(null);
    setSelectedAssignment(null);
    setAssignments([]);
    setSubmissions([]);
  };

  const goBackToAssignments = () => {
    setScreen('assignments');
    setSelectedAssignment(null);
    setSubmissions([]);
  };

  const openGradeModal = (submission: AssignmentSubmission) => {
    setGradeTarget(submission);
    setGradeScore(submission.score != null ? String(submission.score) : '');
    setGradeFeedback(submission.feedback || '');
    setGradeModal(true);
  };

  const handleGradeSubmit = async () => {
    if (!gradeTarget || !selectedAssignment) return;

    const score = parseInt(gradeScore, 10);
    if (isNaN(score) || score < 0) {
      Alert.alert('Error', 'Please enter a valid score');
      return;
    }

    try {
      setSubmittingGrade(true);
      const { error: err } = await assignmentService.gradeSubmission(
        gradeTarget.id,
        score,
        gradeFeedback.trim()
      );

      if (err) {
        Alert.alert('Error', err);
      } else {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === gradeTarget.id
              ? { ...s, score, feedback: gradeFeedback.trim(), graded_at: new Date().toISOString() }
              : s
          )
        );
        setGradeModal(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Grading failed');
    } finally {
      setSubmittingGrade(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStudentInitials = (submission: AssignmentSubmission) => {
    const name = submission.student?.full_name;
    if (name) {
      return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
    }
    return 'ST';
  };

  const getStudentName = (submission: AssignmentSubmission) => {
    return submission.student?.full_name || `Student (${submission.student_id?.slice(0, 8) || 'unknown'})`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        {screen === 'courses' && (
          <View>
            <Text style={styles.headerTitle}>Student Submissions</Text>
            <Text style={styles.headerSubtitle}>Select a course to view submissions</Text>
          </View>
        )}
        {screen === 'assignments' && selectedCourse && (
          <View>
            <TouchableOpacity style={styles.headerBack} onPress={goBackToCourses}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
              <Text style={styles.headerBackText}>Courses</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedCourse.title}</Text>
            <Text style={styles.headerSubtitle}>{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
        {screen === 'submissions' && selectedAssignment && (
          <View>
            <TouchableOpacity style={styles.headerBack} onPress={goBackToAssignments}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
              <Text style={styles.headerBackText}>Assignments</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedAssignment.title}</Text>
            <Text style={styles.headerSubtitle}>{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      {/* Courses Screen */}
      {!loading && screen === 'courses' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
        >
          {courses.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="book-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No courses</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                You don't have any courses assigned yet.
              </Text>
            </View>
          ) : (
            courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[styles.selectCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => loadAssignments(course)}
              >
                <View style={[styles.selectIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="library-outline" size={24} color={theme.primary} />
                </View>
                <View style={styles.selectInfo}>
                  <Text style={[styles.selectTitle, { color: theme.text }]}>{course.title}</Text>
                  <Text style={[styles.selectMeta, { color: theme.textSecondary }]}>
                    {course.code} · {course.semester} {course.year}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Assignments Screen */}
      {!loading && screen === 'assignments' && (
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
                Create an assignment for this course first.
              </Text>
            </View>
          ) : (
            assignments.map((assignment) => (
              <TouchableOpacity
                key={assignment.id}
                style={[styles.selectCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => loadSubmissions(assignment)}
              >
                <View style={[styles.selectIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name="document-text-outline" size={24} color={theme.primary} />
                </View>
                <View style={styles.selectInfo}>
                  <Text style={[styles.selectTitle, { color: theme.text }]}>{assignment.title}</Text>
                  <Text style={[styles.selectMeta, { color: theme.textSecondary }]}>
                    Due: {formatDate(assignment.due_date)} · Max: {assignment.max_score} pts
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Submissions Screen */}
      {!loading && screen === 'submissions' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
        >
          {submissions.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="document-text-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No submissions yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Students haven't submitted this assignment yet.
              </Text>
            </View>
          ) : (
            submissions.map((submission) => {
              const isGraded = submission.score != null;
              const maxScore = selectedAssignment?.max_score || 100;

              return (
                <View key={submission.id} style={[styles.submissionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <View style={styles.submissionHeader}>
                    <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: theme.primary }]}>
                        {getStudentInitials(submission)}
                      </Text>
                    </View>
                    <View style={styles.submissionInfo}>
                      <Text style={[styles.submissionName, { color: theme.text }]}>
                        {getStudentName(submission)}
                      </Text>
                      <Text style={[styles.submissionDate, { color: theme.textSecondary }]}>
                        Submitted {formatDate(submission.submitted_at)}
                      </Text>
                    </View>
                    {isGraded ? (
                      <View style={[styles.gradedBadge, { backgroundColor: '#10B98120' }]}>
                        <Text style={styles.gradedText}>{submission.score}/{maxScore}</Text>
                      </View>
                    ) : (
                      <View style={[styles.ungradedBadge, { backgroundColor: '#F59E0B20' }]}>
                        <Text style={styles.ungradedText}>Ungraded</Text>
                      </View>
                    )}
                  </View>

                  {submission.submission_text ? (
                    <View style={[styles.textCard, { backgroundColor: theme.background }]}>
                      <Text style={[styles.textContent, { color: theme.text }]}>{submission.submission_text}</Text>
                    </View>
                  ) : null}

                  {isGraded ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.primary + '15' }]}
                      onPress={() => openGradeModal(submission)}
                    >
                      <Ionicons name="create-outline" size={16} color={theme.primary} />
                      <Text style={[styles.actionBtnText, { color: theme.primary }]}>Update Grade</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.gradeBtn, { backgroundColor: theme.primary }]}
                      onPress={() => openGradeModal(submission)}
                    >
                      <Ionicons name="ribbon-outline" size={16} color="#fff" />
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Grade</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Grade Modal */}
      <Modal visible={gradeModal} animationType="fade" transparent onRequestClose={() => setGradeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Grade Submission</Text>
              <TouchableOpacity onPress={() => setGradeModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {gradeTarget && (
              <Text style={[styles.modalStudent, { color: theme.textSecondary }]}>
                {getStudentName(gradeTarget)}
              </Text>
            )}

            <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 12 }]}>
              Score (max: {selectedAssignment?.max_score || 100})
            </Text>
            <TextInput
              style={[styles.gradeInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="Enter score"
              placeholderTextColor={theme.textSecondary}
              value={gradeScore}
              onChangeText={setGradeScore}
              keyboardType="numeric"
            />

            <Text style={[styles.modalLabel, { color: theme.text, marginTop: 16 }]}>Feedback</Text>
            <TextInput
              style={[styles.feedbackInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="Feedback to student..."
              placeholderTextColor={theme.textSecondary}
              value={gradeFeedback}
              onChangeText={setGradeFeedback}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: theme.primary, opacity: submittingGrade ? 0.6 : 1 }]}
              onPress={handleGradeSubmit}
              disabled={submittingGrade}
            >
              {submittingGrade ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>Submit Grade</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerBack: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  headerBackText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  selectCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  selectIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  selectInfo: { flex: 1 },
  selectTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  selectMeta: { fontSize: 12, fontWeight: '500' },

  emptyCard: { padding: 40, borderRadius: 18, borderWidth: 1, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  submissionCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  submissionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  submissionInfo: { flex: 1 },
  submissionName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  submissionDate: { fontSize: 12, fontWeight: '500' },
  gradedBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10 },
  gradedText: { fontSize: 14, fontWeight: '800', color: '#10B981' },
  ungradedBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10 },
  ungradedText: { fontSize: 14, fontWeight: '700', color: '#F59E0B' },

  textCard: { padding: 14, borderRadius: 12, marginBottom: 12 },
  textContent: { fontSize: 14, lineHeight: 20 },

  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  gradeBtn: { paddingVertical: 12 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  modalContent: { width: '100%', borderRadius: 20, padding: 24 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalStudent: { fontSize: 14, fontWeight: '500' },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  gradeInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700' },
  feedbackInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  modalSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 20, gap: 8 },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});