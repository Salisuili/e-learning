import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { assignmentService } from '@/services/assignments';
import { courseService } from '@/services/courses';
import { api } from '@/services/supabase';
import { Assignment, AssignmentSubmission, Course, CourseMaterial, User } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

type TabType = 'materials' | 'assignments' | 'students';

interface AssignmentForm {
  title: string;
  description: string;
  due_date: string;
  max_score: string;
}

const INITIAL_ASSIGNMENT_FORM: AssignmentForm = {
  title: '',
  description: '',
  due_date: '',
  max_score: '100',
};

export default function LecturerCourseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('materials');
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [actionLoading, setActionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Assignment modal
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(INITIAL_ASSIGNMENT_FORM);
  const [formErrors, setFormErrors] = useState<string | null>(null);

  // Grading modal
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [selectedAssignmentForGrading, setSelectedAssignmentForGrading] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 3000);
  };

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

      if (materialsRes.error) showMessage(materialsRes.error, 'error');
      setMaterials(materialsRes.materials || []);

      if (assignmentsRes.error) showMessage(assignmentsRes.error, 'error');
      setAssignments(assignmentsRes.assignments || []);

      // Load enrolled students from backend
      try {
        const { enrollments } = await api.get(`/courses/${id}/enrollments`);
        if (enrollments && enrollments.length > 0) {
          const enrolledStudents = enrollments.map((e: any) => e.student).filter(Boolean);
          setStudents(enrolledStudents);
        } else {
          setStudents([]);
        }
      } catch (e) {
        setStudents([]);
      }
    } catch (err) {
      console.error('Failed to load course data:', err);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const pickAndUploadMaterial = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'application/vnd.ms-powerpoint',
               'application/vnd.openxmlformats-officedocument.presentationml.presentation',
               'video/*', 'audio/*', 'application/zip'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setUploading(true);

      // Upload via backend API
      const formData = new FormData();
      formData.append('material', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);
      formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('description', '');

      const response = await api.upload('POST', `/courses/${id}/materials`, formData);
      showMessage('Material uploaded successfully');
      loadData();
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Upload Error', err?.message || 'Failed to upload file. Please try again.');
    }
    setUploading(false);
  };

  const deleteMaterial = (material: CourseMaterial) => {
    Alert.alert('Delete Material', `Delete "${material.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await courseService.deleteMaterial(material.id);
            showMessage('Material deleted');
            setMaterials((prev) => prev.filter((m) => m.id !== material.id));
          } catch (err: any) {
            showMessage(err?.message || 'Delete failed', 'error');
          }
          setActionLoading(false);
        },
      },
    ]);
  };

  // ---- ASSIGNMENTS ----

  const openCreateAssignment = () => {
    setEditingAssignment(null);
    setAssignmentForm(INITIAL_ASSIGNMENT_FORM);
    setFormErrors(null);
    setAssignmentModalVisible(true);
  };

  const openEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      title: assignment.title,
      description: assignment.description || '',
      due_date: new Date(assignment.due_date).toISOString().slice(0, 16),
      max_score: String(assignment.max_score),
    });
    setFormErrors(null);
    setAssignmentModalVisible(true);
  };

  const validateAssignmentForm = (): boolean => {
    if (!assignmentForm.title.trim()) { setFormErrors('Assignment title is required'); return false; }
    if (!assignmentForm.due_date.trim()) { setFormErrors('Due date is required'); return false; }
    if (isNaN(Date.parse(assignmentForm.due_date))) { setFormErrors('Please enter a valid date/time format (e.g. 2026-08-15T23:59)'); return false; }
    const score = parseInt(assignmentForm.max_score, 10);
    if (isNaN(score) || score < 1) { setFormErrors('Max score must be at least 1'); return false; }
    return true;
  };

  const handleSaveAssignment = async () => {
    if (!validateAssignmentForm()) return;

    setActionLoading(true);
    setFormErrors(null);

    const assignmentData = {
      title: assignmentForm.title.trim(),
      description: assignmentForm.description.trim(),
      due_date: new Date(assignmentForm.due_date).toISOString(),
      max_score: parseInt(assignmentForm.max_score, 10),
      created_by: user?.id || '',
    };

    try {
      if (editingAssignment) {
        const { error } = await assignmentService.updateAssignment(editingAssignment.id, assignmentData);
        if (error) setFormErrors(error);
        else {
          showMessage('Assignment updated');
          setAssignmentModalVisible(false);
          loadData();
        }
      } else {
        const { error } = await assignmentService.createAssignment(id!, assignmentData);
        if (error) setFormErrors(error);
        else {
          showMessage('Assignment created');
          setAssignmentModalVisible(false);
          loadData();
        }
      }
    } catch (err: any) {
      setFormErrors(err?.message || 'Failed to save assignment');
    }
    setActionLoading(false);
  };

  const deleteAssignment = (assignment: Assignment) => {
    Alert.alert('Delete Assignment', `Delete "${assignment.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          await assignmentService.deleteAssignment(assignment.id);
          showMessage('Assignment deleted');
          setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
        } catch (err: any) {
          showMessage(err?.message || 'Delete failed', 'error');
        }
        setActionLoading(false);
      }},
    ]);
  };

  // ---- GRADING ----

  const viewSubmissionsForAssignment = async (assignment: Assignment) => {
    setSelectedAssignmentForGrading(assignment);
    setSubmissionsLoading(true);
    try {
      const { submissions: data } = await assignmentService.getAssignmentSubmissions(assignment.id);
      setSubmissions(data || []);
    } catch (err: any) {
      showMessage(err?.message || 'Failed to load submissions', 'error');
    }
    setSubmissionsLoading(false);
  };

  const openGradeModal = (submission: AssignmentSubmission) => {
    setGradingSubmission(submission);
    setGradeScore(submission.score !== null && submission.score !== undefined ? String(submission.score) : '');
    setGradeFeedback(submission.feedback || '');
    setGradeModalVisible(true);
  };

  const handleGrade = async () => {
    if (!gradingSubmission) return;
    const score = parseInt(gradeScore, 10);
    if (isNaN(score) || score < 0) {
      Alert.alert('Error', 'Please enter a valid score');
      return;
    }

    setActionLoading(true);
    try {
      await assignmentService.gradeSubmission(gradingSubmission.id, score, gradeFeedback.trim());
      setSubmissions((prev) =>
        prev.map((s) => s.id === gradingSubmission.id
          ? { ...s, score, feedback: gradeFeedback.trim(), graded_at: new Date().toISOString() }
          : s
        )
      );
      setGradeModalVisible(false);
      showMessage('Submission graded successfully');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Grading failed');
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

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'document-text-outline';
    if (fileType.includes('image')) return 'image-outline';
    return 'document-outline';
  };

  // ---- LOADING / ERROR ----

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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerCode}>{course.code}</Text>
        <Text style={styles.headerTitle} numberOfLines={2}>{course.title}</Text>
        <Text style={styles.headerMeta}>{course.semester} {course.year} · {course.credits} Credits · {course.department}</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        {(['materials', 'assignments', 'students'] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          let count = 0;
          if (tab === 'materials') count = materials.length;
          else if (tab === 'assignments') count = assignments.length;
          else if (tab === 'students') count = students.length;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: isActive ? theme.primary : theme.textSecondary }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
        <View style={[styles.messageBar, { backgroundColor: messageType === 'success' ? '#10B98120' : '#EF444420', borderColor: messageType === 'success' ? '#10B98140' : '#EF444440' }]}>
          <Ionicons name={messageType === 'success' ? 'checkmark-circle' : 'alert-circle'} size={18} color={messageType === 'success' ? '#10B981' : '#EF4444'} />
          <Text style={[styles.messageText, { color: messageType === 'success' ? '#10B981' : '#EF4444' }]}>{message}</Text>
          <TouchableOpacity onPress={() => setMessage(null)}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ========== MATERIALS TAB ========== */}
      {activeTab === 'materials' && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={pickAndUploadMaterial} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="cloud-upload-outline" size={20} color="#fff" /><Text style={styles.actionBtnText}>Upload Material</Text></>}
          </TouchableOpacity>

          {materials.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="folder-open-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No materials yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Upload lecture notes, PDFs, and resources for your students.</Text>
            </View>
          ) : (
            materials.map((material) => (
              <View key={material.id} style={[styles.materialCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={[styles.fileIcon, { backgroundColor: theme.primary + '15' }]}>
                  <Ionicons name={getFileIcon(material.file_type) as any} size={24} color={theme.primary} />
                </View>
                <View style={styles.materialInfo}>
                  <Text style={[styles.materialTitle, { color: theme.text }]} numberOfLines={2}>{material.title}</Text>
                  <Text style={[styles.materialFile, { color: theme.textSecondary }]}>{material.file_name}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteMaterial(material)} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ========== ASSIGNMENTS TAB ========== */}
      {activeTab === 'assignments' && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={openCreateAssignment}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Add Assignment</Text>
          </TouchableOpacity>

          {assignments.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="clipboard-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No assignments</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Create assignments for your students.</Text>
            </View>
          ) : (
            assignments.map((assignment) => (
              <View key={assignment.id} style={[styles.assignmentCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.assignmentHeaderRow}>
                  <Text style={[styles.assignmentTitle, { color: theme.text }]} numberOfLines={2}>{assignment.title}</Text>
                  <View style={styles.assignmentActions}>
                    <TouchableOpacity onPress={() => openEditAssignment(assignment)} style={[styles.iconBtn, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="create-outline" size={16} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteAssignment(assignment)} style={[styles.iconBtn, { backgroundColor: '#EF444415' }]}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                {assignment.description && <Text style={[styles.assignmentDesc, { color: theme.textSecondary }]} numberOfLines={2}>{assignment.description}</Text>}
                <View style={styles.assignmentMeta}>
                  <Ionicons name="calendar-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>Due: {formatDate(assignment.due_date)}</Text>
                  <Ionicons name="star-outline" size={13} color={theme.textSecondary} style={{ marginLeft: 12 }} />
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>Max: {assignment.max_score} pts</Text>
                </View>
                <TouchableOpacity style={[styles.viewSubBtn, { backgroundColor: theme.primary + '15' }]}
                  onPress={() => viewSubmissionsForAssignment(assignment)}>
                  <Ionicons name="people-outline" size={16} color={theme.primary} />
                  <Text style={[styles.viewSubText, { color: theme.primary }]}>View Submissions</Text>
                </TouchableOpacity>

                {selectedAssignmentForGrading?.id === assignment.id && (
                  <View style={{ marginTop: 12 }}>
                    {submissionsLoading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : submissions.length === 0 ? (
                      <Text style={[styles.noSubText, { color: theme.textSecondary }]}>No submissions yet</Text>
                    ) : (
                      submissions.map((sub) => (
                        <View key={sub.id} style={[styles.subCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                          <View style={styles.subHeader}>
                            <Ionicons name="person-outline" size={18} color={theme.textSecondary} />
                            <Text style={[styles.subDate, { color: theme.textSecondary }]}>Submitted {formatDate(sub.submitted_at)}</Text>
                            {sub.score !== null && sub.score !== undefined ? (
                              <Text style={[styles.gradedScore, { color: '#10B981' }]}>{sub.score}/{assignment.max_score}</Text>
                            ) : (
                              <Text style={[styles.ungradedText, { color: '#F59E0B' }]}>Ungraded</Text>
                            )}
                          </View>
                          {sub.submission_text && (
                            <Text style={[styles.subText, { color: theme.text }]} numberOfLines={3}>{sub.submission_text}</Text>
                          )}
                          <TouchableOpacity style={[styles.gradeSmallBtn, { backgroundColor: theme.primary }]}
                            onPress={() => openGradeModal(sub)}>
                            <Text style={styles.gradeSmallText}>{sub.score !== null && sub.score !== undefined ? 'Update Grade' : 'Grade'}</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ========== STUDENTS TAB ========== */}
      {activeTab === 'students' && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>Enrolled Students ({students.length})</Text>
          {students.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="people-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No students enrolled</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Students will appear here once they are enrolled in this course.</Text>
            </View>
          ) : (
            students.map((student) => (
              <View key={student.id} style={[styles.studentCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={[styles.studentAvatar, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.studentAvatarText, { color: '#10B981' }]}>
                    {student.full_name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: theme.text }]}>{student.full_name}</Text>
                  <Text style={[styles.studentEmail, { color: theme.textSecondary }]}>{student.email}</Text>
                  {student.identification_number && (
                    <Text style={[styles.studentIdNumber, { color: theme.textSecondary }]}>ID: {student.identification_number}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Assignment Modal */}
      <Modal visible={assignmentModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAssignmentModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setAssignmentModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingAssignment ? 'Edit Assignment' : 'New Assignment'}</Text>
            <TouchableOpacity onPress={handleSaveAssignment} disabled={actionLoading}>
              <Text style={[styles.saveBtn, { color: actionLoading ? theme.textSecondary : theme.primary }]}>
                {actionLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {formErrors && (
              <View style={[styles.formError, { backgroundColor: '#EF444415' }]}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={{ color: '#EF4444', flex: 1 }}>{formErrors}</Text>
              </View>
            )}
            <Text style={[styles.formLabel, { color: theme.text }]}>Title *</Text>
            <TextInput style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="Assignment title" placeholderTextColor={theme.textSecondary}
              value={assignmentForm.title} onChangeText={(t) => setAssignmentForm({ ...assignmentForm, title: t })} />

            <Text style={[styles.formLabel, { color: theme.text, marginTop: 16 }]}>Description</Text>
            <TextInput style={[styles.formInput, styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="Describe the assignment..." placeholderTextColor={theme.textSecondary}
              value={assignmentForm.description} onChangeText={(t) => setAssignmentForm({ ...assignmentForm, description: t })}
              multiline numberOfLines={4} textAlignVertical="top" />

            <Text style={[styles.formLabel, { color: theme.text, marginTop: 16 }]}>Due Date * (YYYY-MM-DDTHH:MM)</Text>
            <TextInput style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="e.g. 2026-08-15T23:59" placeholderTextColor={theme.textSecondary}
              value={assignmentForm.due_date} onChangeText={(t) => setAssignmentForm({ ...assignmentForm, due_date: t })} />

            <Text style={[styles.formLabel, { color: theme.text, marginTop: 16 }]}>Max Score *</Text>
            <TextInput style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="100" placeholderTextColor={theme.textSecondary}
              value={assignmentForm.max_score} onChangeText={(t) => setAssignmentForm({ ...assignmentForm, max_score: t })}
              keyboardType="numeric" />
          </ScrollView>
        </View>
      </Modal>

      {/* Grade Modal */}
      <Modal visible={gradeModalVisible} animationType="fade" transparent onRequestClose={() => setGradeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.gradeModalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Grade Submission</Text>
              <TouchableOpacity onPress={() => setGradeModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.formLabel, { color: theme.textSecondary, marginBottom: 8 }]}>Score</Text>
            <TextInput style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background, fontSize: 18, fontWeight: '700' }]}
              placeholder="0" placeholderTextColor={theme.textSecondary}
              value={gradeScore} onChangeText={setGradeScore} keyboardType="numeric" />
            <Text style={[styles.formLabel, { color: theme.text, marginTop: 16 }]}>Feedback</Text>
            <TextInput style={[styles.formInput, styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="Feedback to student..." placeholderTextColor={theme.textSecondary}
              value={gradeFeedback} onChangeText={setGradeFeedback} multiline numberOfLines={3} textAlignVertical="top" />
            <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: theme.primary, marginTop: 20 }]}
              onPress={handleGrade} disabled={actionLoading}>
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
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 12, marginBottom: 16 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  headerBack: { marginBottom: 8 },
  headerCode: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1, marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerMeta: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tabCountText: { fontSize: 11, fontWeight: '700' },
  messageBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  messageText: { flex: 1, fontSize: 13, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 16, gap: 8 },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyCard: { padding: 32, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  sectionLabel: { fontSize: 18, fontWeight: '700', marginBottom: 12 },

  // Materials
  materialCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  fileIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  materialInfo: { flex: 1 },
  materialTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  materialFile: { fontSize: 12, fontWeight: '500' },

  // Assignments
  assignmentCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  assignmentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  assignmentTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  assignmentActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 8, borderRadius: 8 },
  assignmentDesc: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  assignmentMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  metaText: { fontSize: 12, fontWeight: '500' },
  viewSubBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  viewSubText: { fontSize: 13, fontWeight: '700' },
  noSubText: { fontSize: 13, textAlign: 'center', marginTop: 8 },

  // Submissions inline
  subCard: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  subDate: { flex: 1, fontSize: 11, fontWeight: '500' },
  gradedScore: { fontSize: 13, fontWeight: '800' },
  ungradedText: { fontSize: 13, fontWeight: '700' },
  subText: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  gradeSmallBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  gradeSmallText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Students
  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { fontSize: 16, fontWeight: '700' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600' },
  studentEmail: { fontSize: 12, fontWeight: '500' },
  studentIdNumber: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  modalContent: { width: '100%', borderRadius: 20, padding: 24 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  gradeModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  saveBtn: { fontSize: 16, fontWeight: '700' },
  modalBody: { flex: 1 },
  formError: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  modalSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
});