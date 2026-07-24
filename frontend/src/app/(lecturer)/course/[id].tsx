import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { assignmentService } from '@/services/assignments';
import { courseService } from '@/services/courses';
import { api } from '@/services/supabase';
import { Assignment, Course, CourseMaterial } from '@/types';
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

type TabType = 'materials' | 'assignments';

export default function LecturerCourseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('materials');
  const [message, setMessage] = useState<string | null>(null);

  // Create assignment modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newMaxScore, setNewMaxScore] = useState('100');
  const [creating, setCreating] = useState(false);

  // Upload material modal
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string; mimeType?: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickMaterialFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile({ name: file.name, uri: file.uri, mimeType: file.mimeType || undefined });
      }
    } catch (err) {
      console.error('Document picker error:', err);
    }
  };

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
    } catch (err) {
      setMessage('Failed to load course data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateAssignment = async () => {
    if (!id || !newTitle.trim() || !newDueDate.trim()) {
      Alert.alert('Error', 'Title and due date are required');
      return;
    }

    setCreating(true);
    try {
      const { error } = await assignmentService.createAssignment(id, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        due_date: new Date(newDueDate).toISOString(),
        max_score: parseInt(newMaxScore, 10) || 100,
      } as any);

      if (error) {
        Alert.alert('Error', error);
      } else {
        setCreateModalVisible(false);
        setNewTitle('');
        setNewDescription('');
        setNewDueDate('');
        setNewMaxScore('100');
        loadData();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create assignment');
    }
    setCreating(false);
  };

  const confirmDeleteAssignment = (assignment: Assignment) => {
    Alert.alert('Delete Assignment', `Delete "${assignment.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await assignmentService.deleteAssignment(assignment.id);
          if (error) Alert.alert('Error', error);
          else {
            setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
          }
        },
      },
    ]);
  };

  const handleUploadMaterial = async () => {
    if (!id || !materialTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', materialTitle.trim());
      formData.append('description', materialDescription.trim() || '');
      formData.append('material', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/octet-stream',
      } as any);

      const response = await api.upload('POST', `/courses/${id}/materials`, formData);

      if (response.error) {
        Alert.alert('Error', response.error);
      } else {
        setUploadModalVisible(false);
        setMaterialTitle('');
        setMaterialDescription('');
        setSelectedFile(null);
        loadData();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to upload material');
    }
    setUploading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.primary} />
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
          const count = tab === 'materials' ? materials.length : assignments.length;
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
        {/* Course Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Description</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            {course.description || 'No description provided.'}
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Department</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{course.department}</Text>
        </View>

        {activeTab === 'materials' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Course Materials</Text>
              <TouchableOpacity
                style={[styles.addSmallBtn, { backgroundColor: theme.primary + '15' }]}
                onPress={() => setUploadModalVisible(true)}
              >
                <Ionicons name="add" size={18} color={theme.primary} />
                <Text style={[styles.addSmallText, { color: theme.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
            {materials.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="folder-open-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.4 }} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No materials yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Upload course materials for your students.
                </Text>
              </View>
            ) : (
              materials.map((material) => (
                <View key={material.id} style={[styles.materialCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <View style={[styles.fileIcon, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="document-outline" size={24} color={theme.primary} />
                  </View>
                  <View style={styles.materialInfo}>
                    <Text style={[styles.materialTitle, { color: theme.text }]} numberOfLines={2}>{material.title}</Text>
                    <Text style={[styles.materialMeta, { color: theme.textSecondary }]}>{material.file_name}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Assignments</Text>
              <TouchableOpacity
                style={[styles.addSmallBtn, { backgroundColor: theme.primary + '15' }]}
                onPress={() => setCreateModalVisible(true)}
              >
                <Ionicons name="add" size={18} color={theme.primary} />
                <Text style={[styles.addSmallText, { color: theme.primary }]}>Create</Text>
              </TouchableOpacity>
            </View>
            {assignments.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="clipboard-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.4 }} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No assignments yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Create assignments for your students.
                </Text>
              </View>
            ) : (
              assignments.map((assignment) => (
                <View key={assignment.id} style={[styles.assignmentCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <View style={styles.assignmentContent}>
                    <Text style={[styles.assignmentTitle, { color: theme.text }]}>{assignment.title}</Text>
                    {assignment.description && (
                      <Text style={[styles.assignmentDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                        {assignment.description}
                      </Text>
                    )}
                    <View style={styles.assignmentMeta}>
                      <Text style={[styles.assignmentMetaText, { color: theme.textSecondary }]}>
                        Due: {formatDate(assignment.due_date)}
                      </Text>
                      <Text style={[styles.assignmentMetaText, { color: theme.textSecondary }]}>
                        Max: {assignment.max_score} pts
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: theme.error + '12' }]}
                      onPress={() => confirmDeleteAssignment(assignment)}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.error} />
                      <Text style={[styles.deleteBtnText, { color: theme.error }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Upload Material Modal */}
      <Modal visible={uploadModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setUploadModalVisible(false)}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}></View>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Material</Text>
            <TouchableOpacity onPress={handleUploadMaterial} disabled={uploading}>
              <Text style={[styles.modalDone, { color: uploading ? theme.textSecondary : theme.primary, opacity: uploading ? 0.5 : 1 }]}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Title *</Text>
            <TextInput
              style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="Material title"
              placeholderTextColor={theme.textSecondary}
              value={materialTitle}
              onChangeText={setMaterialTitle}
            />
            <Text style={[styles.formLabel, { color: theme.text, marginTop: 16 }]}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="Material description (optional)"
              placeholderTextColor={theme.textSecondary}
              value={materialDescription}
              onChangeText={setMaterialDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={[styles.formLabel, { color: theme.text, marginTop: 16 }]}>File *</Text>
            <TouchableOpacity
              style={[styles.uploadFileBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}
              onPress={pickMaterialFile}
            >
              <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
              <View style={styles.uploadFileInfo}>
                {selectedFile ? (
                  <>
                    <Text style={[styles.uploadFileName, { color: theme.text }]} numberOfLines={1}>{selectedFile.name}</Text>
                    <Text style={[styles.uploadFileHint, { color: theme.textSecondary }]}>Tap to change file</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.uploadFileName, { color: theme.text }]}>Select a file</Text>
                    <Text style={[styles.uploadFileHint, { color: theme.textSecondary }]}>PDF, DOC, DOCX, or Image</Text>
                  </>
                )}
              </View>
              <Ionicons name="document-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Assignment Modal */}
      <Modal visible={createModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}></View>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Assignment</Text>
            <TouchableOpacity onPress={handleCreateAssignment} disabled={creating}>
              <Text style={[styles.modalDone, { color: creating ? theme.textSecondary : theme.primary, opacity: creating ? 0.5 : 1 }]}>
                {creating ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Title *</Text>
            <TextInput
              style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="Assignment title"
              placeholderTextColor={theme.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <Text style={[styles.formLabel, { color: theme.text, marginTop: 16 }]}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="Assignment description"
              placeholderTextColor={theme.textSecondary}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={[styles.formLabel, { color: theme.text, marginTop: 16 }]}>Due Date *</Text>
            <TextInput
              style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary}
              value={newDueDate}
              onChangeText={setNewDueDate}
            />
            <Text style={[styles.formLabel, { color: theme.text, marginTop: 16 }]}>Max Score</Text>
            <TextInput
              style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="100"
              placeholderTextColor={theme.textSecondary}
              value={newMaxScore}
              onChangeText={setNewMaxScore}
              keyboardType="numeric"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 24 },
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  addSmallBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, gap: 4 },
  addSmallText: { fontSize: 13, fontWeight: '700' },
  emptyCard: { padding: 32, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  materialCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  fileIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  materialInfo: { flex: 1 },
  materialTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  materialMeta: { fontSize: 12, fontWeight: '500' },
  assignmentCard: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  assignmentContent: { padding: 14 },
  assignmentTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  assignmentDesc: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  assignmentMeta: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  assignmentMetaText: { fontSize: 12, fontWeight: '500' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, gap: 4 },
  deleteBtnText: { fontSize: 12, fontWeight: '700' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalCancel: { fontSize: 16, fontWeight: '600' },
  modalDone: { fontSize: 16, fontWeight: '700' },
  modalBody: { padding: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  formTextArea: { minHeight: 100, textAlignVertical: 'top' },
  uploadFileBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14, gap: 12 },
  uploadFileInfo: { flex: 1 },
  uploadFileName: { fontSize: 14, fontWeight: '600' },
  uploadFileHint: { fontSize: 12, fontWeight: '500', marginTop: 2 },
});