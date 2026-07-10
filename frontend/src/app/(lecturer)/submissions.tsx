import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';
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

export default function LecturerSubmissions() {
  const { user } = useAuth();
  const theme = useTheme();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Grading modal
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const loadCourses = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('courses')
        .select('*')
        .eq('lecturer_id', user.id)
        .order('created_at', { ascending: false });

      if (err) {
        if (!err.message.includes('relation') && !err.message.includes('does not exist')) {
          setError(err.message);
        }
        setCourses([]);
      } else {
        setCourses((data as Course[]) || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load courses');
      setCourses([]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    if (selectedCourse) {
      await loadAssignmentsForCourse(selectedCourse);
    } else {
      await loadCourses();
    }
    setRefreshing(false);
  };

  const loadAssignmentsForCourse = async (course: Course) => {
    setSelectedCourse(course);
    setSelectedAssignment(null);
    setSubmissions([]);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', course.id)
        .order('due_date', { ascending: true });

      if (err) {
        if (!err.message.includes('relation') && !err.message.includes('does not exist')) {
          setError(err.message);
        }
        setAssignments([]);
      } else {
        setAssignments((data as Assignment[]) || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load assignments');
      setAssignments([]);
    }
  };

  const loadSubmissions = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionsLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignment.id)
        .order('submitted_at', { ascending: false });

      if (err) {
        if (!err.message.includes('relation') && !err.message.includes('does not exist')) {
          setError(err.message);
        }
        setSubmissions([]);
      } else {
        setSubmissions((data as AssignmentSubmission[]) || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load submissions');
      setSubmissions([]);
    }
    setSubmissionsLoading(false);
  };

  const backToCourses = () => {
    setSelectedCourse(null);
    setSelectedAssignment(null);
    setAssignments([]);
    setSubmissions([]);
    setError(null);
  };

  const backToAssignments = () => {
    setSelectedAssignment(null);
    setSubmissions([]);
    setError(null);
  };

  const openGradeModal = (submission: AssignmentSubmission) => {
    setGradingSubmission(submission);
    setGradeScore(submission.score !== null && submission.score !== undefined ? String(submission.score) : '');
    setGradeFeedback(submission.feedback || '');
    setGradeModalVisible(true);
  };

  const handleGrade = async () => {
    if (!gradingSubmission || !selectedAssignment) return;
    const score = parseInt(gradeScore, 10);
    if (isNaN(score) || score < 0) {
      Alert.alert('Error', 'Please enter a valid score');
      return;
    }

    setActionLoading(true);
    try {
      const { error: err } = await supabase
        .from('assignment_submissions')
        .update({
          score,
          feedback: gradeFeedback.trim(),
          graded_at: new Date().toISOString(),
        })
        .eq('id', gradingSubmission.id);

      if (err) Alert.alert('Error', err.message);
      else {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === gradingSubmission.id
              ? { ...s, score, feedback: gradeFeedback.trim(), graded_at: new Date().toISOString() }
              : s
          )
        );
        setGradeModalVisible(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Grading failed');
    }
    setActionLoading(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  // Step 1: Select Course
  if (!selectedCourse) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <Text style={styles.headerTitle}>Student Submissions</Text>
          <Text style={styles.headerSubtitle}>Select a course to view submissions</Text>
        </View>

        {error && (
          <View style={[styles.errorBar, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
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
                  onPress={() => loadAssignmentsForCourse(course)}
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
      </View>
    );
  }

  // Step 2: Select Assignment
  if (!selectedAssignment) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <TouchableOpacity style={styles.headerBack} onPress={backToCourses}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
            <Text style={styles.headerBackText}>Courses</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedCourse.title}</Text>
          <Text style={styles.headerSubtitle}>
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {error && (
          <View style={[styles.errorBar, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
      </View>
    );
  }

  // Step 3: View Submissions
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity style={styles.headerBack} onPress={backToAssignments}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <Text style={styles.headerBackText}>Assignments</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedAssignment.title}</Text>
        <Text style={styles.headerSubtitle}>
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {error && (
        <View style={[styles.errorBar, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
          <Ionicons name="alert-circle" size={18} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {submissionsLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
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
            submissions.map((submission) => (
              <View key={submission.id} style={[styles.submissionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.submissionHeader}>
                  <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="person-outline" size={22} color={theme.primary} />
                  </View>
                  <View style={styles.submissionInfo}>
                    <Text style={[styles.submissionDate, { color: theme.textSecondary }]}>
                      Submitted {formatDate(submission.submitted_at)}
                    </Text>
                  </View>
                  {submission.score !== null && submission.score !== undefined ? (
                    <View style={[styles.gradedBadge, { backgroundColor: '#10B98120' }]}>
                      <Text style={styles.gradedText}>{submission.score}/{selectedAssignment.max_score}</Text>
                    </View>
                  ) : (
                    <View style={[styles.ungradedBadge, { backgroundColor: '#F59E0B20' }]}>
                      <Text style={styles.ungradedText}>Ungraded</Text>
                    </View>
                  )}
                </View>

                {submission.submission_text && (
                  <View style={[styles.textCard, { backgroundColor: theme.background }]}>
                    <Text style={[styles.textContent, { color: theme.text }]}>{submission.submission_text}</Text>
                  </View>
                )}

                {submission.score === null || submission.score === undefined ? (
                  <TouchableOpacity style={[styles.gradeBtn, { backgroundColor: theme.primary }]} onPress={() => openGradeModal(submission)}>
                    <Ionicons name="ribbon-outline" size={16} color="#fff" />
                    <Text style={styles.gradeBtnText}>Grade</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.regradeBtn, { backgroundColor: theme.primary + '15' }]} onPress={() => openGradeModal(submission)}>
                    <Ionicons name="create-outline" size={16} color={theme.primary} />
                    <Text style={[styles.regradeText, { color: theme.primary }]}>Update Grade</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Grade Modal */}
      <Modal visible={gradeModalVisible} animationType="fade" transparent onRequestClose={() => setGradeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Grade Submission</Text>
              <TouchableOpacity onPress={() => setGradeModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Score (max: {selectedAssignment.max_score})</Text>
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

            <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: theme.primary, marginTop: 20, opacity: actionLoading ? 0.6 : 1 }]} onPress={handleGrade} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Submit Grade</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
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
  errorBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  errorText: { flex: 1, fontSize: 13, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
  submissionInfo: { flex: 1 },
  submissionDate: { fontSize: 12, fontWeight: '500' },
  gradedBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10 },
  gradedText: { fontSize: 14, fontWeight: '800', color: '#10B981' },
  ungradedBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10 },
  ungradedText: { fontSize: 14, fontWeight: '700', color: '#F59E0B' },

  textCard: { padding: 14, borderRadius: 12, marginBottom: 12 },
  textContent: { fontSize: 14, lineHeight: 20 },

  gradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  gradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  regradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  regradeText: { fontSize: 13, fontWeight: '700' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  modalContent: { width: '100%', borderRadius: 20, padding: 24 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  gradeInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700' },
  feedbackInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  modalSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
});