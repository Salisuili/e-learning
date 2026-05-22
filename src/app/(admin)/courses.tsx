import { useTheme } from '@/hooks/use-theme';
import { courseService } from '@/services/courses';
import { userService } from '@/services/users';
import { Course, User } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type SortField = 'title' | 'code' | 'department' | 'credits' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface CourseForm {
  code: string;
  title: string;
  description: string;
  department: string;
  lecturer_id: string;
  credits: string;
  semester: string;
  year: string;
}

const INITIAL_FORM: CourseForm = {
  code: '',
  title: '',
  description: '',
  department: '',
  lecturer_id: '',
  credits: '3',
  semester: 'First',
  year: String(new Date().getFullYear()),
};

const DEPARTMENTS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Engineering',
  'Business',
  'Arts',
  'Law',
  'Medicine',
];

const SEMESTERS = ['First', 'Second'];

export default function AdminCourses() {
  const theme = useTheme();

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<string | null>(null);

  // Detail modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrollmentCount, setEnrollmentCount] = useState(0);

  // Sorting & filtering
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    const [coursesRes, lecturersRes] = await Promise.all([
      courseService.getAllCourses(),
      userService.getUsersByRole('lecturer'),
    ]);

    if (coursesRes.error) {
      setMessage(coursesRes.error);
    } else {
      setCourses(coursesRes.courses || []);
    }

    if (lecturersRes.error) {
      console.warn('Failed to load lecturers:', lecturersRes.error);
    } else {
      setLecturers(lecturersRes.users || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Stats
  const stats = useMemo(() => {
    const total = courses.length;
    const departments = new Set(courses.map((c) => c.department));
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    return { total, departments: departments.size, totalCredits };
  }, [courses]);

  // Filtered & sorted courses
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q) ||
          (c.lecturer_name && c.lecturer_name.toLowerCase().includes(q)),
      );
    }

    // Department filter
    if (departmentFilter) {
      result = result.filter((c) => c.department === departmentFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'code':
          cmp = a.code.localeCompare(b.code);
          break;
        case 'department':
          cmp = a.department.localeCompare(b.department);
          break;
        case 'credits':
          cmp = a.credits - b.credits;
          break;
        case 'created_at':
          cmp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [courses, search, departmentFilter, sortField, sortOrder]);

  // Department breakdown
  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    courses.forEach((c) => {
      map.set(c.department, (map.get(c.department) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [courses]);

  // Get lecturer name
  const getLecturerName = (lecturerId: string) => {
    const lecturer = lecturers.find((l) => l.id === lecturerId);
    return lecturer?.full_name || 'Unknown';
  };

  // ---- CRUD Operations ----

  const openCreateModal = () => {
    setEditingCourse(null);
    setForm(INITIAL_FORM);
    setFormErrors(null);
    setModalVisible(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setForm({
      code: course.code,
      title: course.title,
      description: course.description,
      department: course.department,
      lecturer_id: course.lecturer_id,
      credits: String(course.credits),
      semester: course.semester,
      year: String(course.year),
    });
    setFormErrors(null);
    setModalVisible(true);
  };

  const validateForm = (): boolean => {
    if (!form.code.trim()) {
      setFormErrors('Course code is required');
      return false;
    }
    if (!form.title.trim()) {
      setFormErrors('Course title is required');
      return false;
    }
    if (!form.department) {
      setFormErrors('Department is required');
      return false;
    }
    if (!form.lecturer_id) {
      setFormErrors('Please select a lecturer');
      return false;
    }
    const credits = parseInt(form.credits, 10);
    if (isNaN(credits) || credits < 1 || credits > 6) {
      setFormErrors('Credits must be between 1 and 6');
      return false;
    }
    if (!form.semester) {
      setFormErrors('Semester is required');
      return false;
    }
    if (!form.year || isNaN(parseInt(form.year, 10))) {
      setFormErrors('Valid year is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setActionLoading(true);
    setFormErrors(null);

    const courseData = {
      code: form.code.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      department: form.department,
      lecturer_id: form.lecturer_id,
      credits: parseInt(form.credits, 10),
      semester: form.semester,
      year: parseInt(form.year, 10),
    };

    if (editingCourse) {
      // Update
      const { error } = await courseService.updateCourse(
        editingCourse.id,
        courseData,
      );
      if (error) {
        setFormErrors(error);
      } else {
        setMessage('Course updated successfully');
        setModalVisible(false);
        loadData();
      }
    } else {
      // Create
      const { error } = await courseService.createCourse(courseData);
      if (error) {
        setFormErrors(error);
      } else {
        setMessage('Course created successfully');
        setModalVisible(false);
        loadData();
      }
    }

    setActionLoading(false);
  };

  const confirmDelete = (course: Course) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${course.title}" (${course.code})?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const { error } = await courseService.deleteCourse(course.id);
            if (error) {
              setMessage(error);
            } else {
              setMessage('Course deleted');
              setCourses((prev) => prev.filter((c) => c.id !== course.id));
              if (selectedCourse?.id === course.id) {
                setDetailModalVisible(false);
              }
            }
            setActionLoading(false);
          },
        },
      ],
    );
  };

  // View course detail
  const openDetail = async (course: Course) => {
    setSelectedCourse(course);
    setDetailModalVisible(true);

    // Try to get enrollment count
    try {
      const { materials } = await courseService.getCourseMaterials(course.id);
      // Estimate enrollment count from materials or just show info
      setEnrollmentCount(0);
    } catch {
      setEnrollmentCount(0);
    }
  };

  // Render course card
  const renderCourseItem = ({ item }: { item: Course }) => {
    const lecturerName =
      item.lecturer_name || getLecturerName(item.lecturer_id);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openDetail(item)}
        onLongPress={() => {
          Alert.alert('Course Actions', `${item.title} (${item.code})`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Edit',
              onPress: () => openEditModal(item),
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => confirmDelete(item),
            },
          ]);
        }}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.codeBadge,
                { backgroundColor: theme.primary + '20' },
              ]}
            >
              <Text style={[styles.codeText, { color: theme.primary }]}>
                {item.code}
              </Text>
            </View>
            <View style={styles.creditBadge}>
              <Text style={[styles.creditText, { color: theme.warning }]}>
                {item.credits} {item.credits === 1 ? 'Credit' : 'Credits'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Details */}
          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Ionicons
                name="business-outline"
                size={14}
                color={theme.textSecondary}
              />
              <Text
                style={[styles.detailText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {item.department}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="person-outline"
                size={14}
                color={theme.textSecondary}
              />
              <Text
                style={[styles.detailText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {lecturerName}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={theme.textSecondary}
              />
              <Text
                style={[styles.detailText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {item.semester} {item.year}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: theme.primary + '15' }]}
              onPress={() => openEditModal(item)}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={theme.primary}
              />
              <Text style={[styles.cardBtnText, { color: theme.primary }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: theme.error + '15' }]}
              onPress={() => confirmDelete(item)}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={theme.error}
              />
              <Text style={[styles.cardBtnText, { color: theme.error }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortChip = (label: string, field: SortField) => {
    const isActive = sortField === field;
    return (
      <TouchableOpacity
        style={[
          styles.sortChip,
          {
            backgroundColor: isActive ? theme.primary + '20' : theme.backgroundElement,
            borderColor: isActive ? theme.primary : theme.border,
          },
        ]}
        onPress={() => toggleSort(field)}
      >
        <Text
          style={[
            styles.sortChipText,
            { color: isActive ? theme.primary : theme.textSecondary },
          ]}
        >
          {label}
        </Text>
        {isActive && (
          <Ionicons
            name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={theme.primary}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            Course Management
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {courses.length} course{courses.length !== 1 ? 's' : ''} total
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <Animated.View
        style={[styles.statsRow, { opacity: fadeAnim }]}
      >
        <View
          style={[
            styles.statCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.statValue, { color: theme.primary }]}>
            {stats.total}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Total Courses
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.statValue, { color: theme.success }]}>
            {stats.departments}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Departments
          </Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.statValue, { color: theme.warning }]}>
            {stats.totalCredits}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Total Credits
          </Text>
        </View>
      </Animated.View>

      {/* Department Breakdown */}
      {departmentBreakdown.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.deptScroll}
          contentContainerStyle={styles.deptScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.deptChip,
              {
                backgroundColor: !departmentFilter
                  ? theme.primary + '20'
                  : theme.backgroundElement,
                borderColor: !departmentFilter ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setDepartmentFilter(null)}
          >
            <Text
              style={[
                styles.deptChipText,
                {
                  color: !departmentFilter
                    ? theme.primary
                    : theme.textSecondary,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {departmentBreakdown.map(([dept, count]) => (
            <TouchableOpacity
              key={dept}
              style={[
                styles.deptChip,
                {
                  backgroundColor:
                    departmentFilter === dept
                      ? theme.primary + '20'
                      : theme.backgroundElement,
                  borderColor:
                    departmentFilter === dept ? theme.primary : theme.border,
                },
              ]}
              onPress={() =>
                setDepartmentFilter(departmentFilter === dept ? null : dept)
              }
            >
              <Text
                style={[
                  styles.deptChipText,
                  {
                    color:
                      departmentFilter === dept
                        ? theme.primary
                        : theme.textSecondary,
                  },
                ]}
              >
                {dept} ({count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Search & Sort */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchContainer,
            { borderColor: theme.border, backgroundColor: theme.cardBackground },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={theme.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search courses..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScroll}
        contentContainerStyle={styles.sortScrollContent}
      >
        {renderSortChip('Title', 'title')}
        {renderSortChip('Code', 'code')}
        {renderSortChip('Department', 'department')}
        {renderSortChip('Credits', 'credits')}
        {renderSortChip('Date', 'created_at')}
      </ScrollView>

      {/* Message */}
      {message && (
        <View
          style={[
            styles.messageBar,
            {
              backgroundColor:
                message.includes('success') || message.includes('updated')
                  ? theme.success + '20'
                  : theme.error + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              {
                color:
                  message.includes('success') || message.includes('updated')
                    ? theme.success
                    : theme.error,
              },
            ]}
          >
            {message}
          </Text>
          <TouchableOpacity onPress={() => setMessage(null)}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Course List */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading courses...
          </Text>
        </View>
      ) : filteredCourses.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons
            name="book-outline"
            size={64}
            color={theme.textSecondary}
            style={{ opacity: 0.4 }}
          />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {search || departmentFilter
              ? 'No courses found'
              : 'No courses yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {search || departmentFilter
              ? 'Try adjusting your search or filters'
              : 'Click "New Course" to create one'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshData}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Loading overlay */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.background },
          ]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingCourse ? 'Edit Course' : 'New Course'}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={actionLoading}
            >
              <Text
                style={[
                  styles.saveBtn,
                  {
                    color: actionLoading
                      ? theme.textSecondary
                      : theme.primary,
                    opacity: actionLoading ? 0.5 : 1,
                  },
                ]}
              >
                {actionLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Form Error */}
            {formErrors && (
              <View
                style={[
                  styles.formErrorContainer,
                  { backgroundColor: theme.error + '15' },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={theme.error}
                />
                <Text style={[styles.formErrorText, { color: theme.error }]}>
                  {formErrors}
                </Text>
              </View>
            )}

            {/* Course Code */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>
                Course Code *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.cardBackground,
                  },
                ]}
                placeholder="e.g. CS101"
                placeholderTextColor={theme.textSecondary}
                value={form.code}
                onChangeText={(t) => setForm({ ...form, code: t })}
                autoCapitalize="characters"
              />
            </View>

            {/* Course Title */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>
                Course Title *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.cardBackground,
                  },
                ]}
                placeholder="e.g. Introduction to Computer Science"
                placeholderTextColor={theme.textSecondary}
                value={form.title}
                onChangeText={(t) => setForm({ ...form, title: t })}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  styles.formTextArea,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.cardBackground,
                  },
                ]}
                placeholder="Course description..."
                placeholderTextColor={theme.textSecondary}
                value={form.description}
                onChangeText={(t) => setForm({ ...form, description: t })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Department */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>
                Department *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pickerScroll}
              >
                {DEPARTMENTS.map((dept) => (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.pickerChip,
                      {
                        backgroundColor:
                          form.department === dept
                            ? theme.primary + '20'
                            : theme.backgroundElement,
                        borderColor:
                          form.department === dept
                            ? theme.primary
                            : theme.border,
                      },
                    ]}
                    onPress={() => setForm({ ...form, department: dept })}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        {
                          color:
                            form.department === dept
                              ? theme.primary
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      {dept}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Lecturer */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>
                Lecturer *
              </Text>
              {lecturers.length === 0 ? (
                <Text
                  style={[
                    styles.formHint,
                    { color: theme.textSecondary },
                  ]}
                >
                  No lecturers available. Please add lecturers first.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.pickerScroll}
                >
                  {lecturers.map((lecturer) => (
                    <TouchableOpacity
                      key={lecturer.id}
                      style={[
                        styles.pickerChip,
                        {
                          backgroundColor:
                            form.lecturer_id === lecturer.id
                              ? theme.primary + '20'
                              : theme.backgroundElement,
                          borderColor:
                            form.lecturer_id === lecturer.id
                              ? theme.primary
                              : theme.border,
                        },
                      ]}
                      onPress={() =>
                        setForm({ ...form, lecturer_id: lecturer.id })
                      }
                    >
                      <Ionicons
                        name="person"
                        size={14}
                        color={
                          form.lecturer_id === lecturer.id
                            ? theme.primary
                            : theme.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.pickerChipText,
                          {
                            color:
                              form.lecturer_id === lecturer.id
                                ? theme.primary
                                : theme.textSecondary,
                          },
                        ]}
                      >
                        {lecturer.full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Credits & Semester Row */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: theme.text }]}>
                  Credits *
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.cardBackground,
                    },
                  ]}
                  placeholder="3"
                  placeholderTextColor={theme.textSecondary}
                  value={form.credits}
                  onChangeText={(t) => setForm({ ...form, credits: t })}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={[styles.formLabel, { color: theme.text }]}>
                  Year *
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.cardBackground,
                    },
                  ]}
                  placeholder="2025"
                  placeholderTextColor={theme.textSecondary}
                  value={form.year}
                  onChangeText={(t) => setForm({ ...form, year: t })}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Semester */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>
                Semester *
              </Text>
              <View style={styles.semesterRow}>
                {SEMESTERS.map((sem) => (
                  <TouchableOpacity
                    key={sem}
                    style={[
                      styles.semesterBtn,
                      {
                        backgroundColor:
                          form.semester === sem
                            ? theme.primary
                            : theme.backgroundElement,
                        borderColor:
                          form.semester === sem ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setForm({ ...form, semester: sem })}
                  >
                    <Text
                      style={[
                        styles.semesterBtnText,
                        {
                          color:
                            form.semester === sem ? '#fff' : theme.textSecondary,
                        },
                      ]}
                    >
                      {sem} Semester
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Course Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {selectedCourse && (
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.background },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Course Details
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDetailModalVisible(false);
                  openEditModal(selectedCourse);
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={24}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
            >
              {/* Course Header */}
              <View
                style={[
                  styles.detailHero,
                  { backgroundColor: theme.primary + '10' },
                ]}
              >
                <View
                  style={[
                    styles.detailCodeBadge,
                    { backgroundColor: theme.primary + '25' },
                  ]}
                >
                  <Text
                    style={[
                      styles.detailCodeText,
                      { color: theme.primary },
                    ]}
                  >
                    {selectedCourse.code}
                  </Text>
                </View>
                <Text style={[styles.detailTitle, { color: theme.text }]}>
                  {selectedCourse.title}
                </Text>
              </View>

              {/* Info Cards */}
              <View style={styles.detailSection}>
                <View style={styles.detailInfoRow}>
                  <View
                    style={[
                      styles.detailInfoCard,
                      { backgroundColor: theme.cardBackground, borderColor: theme.border },
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={theme.primary}
                    />
                    <Text
                      style={[
                        styles.detailInfoLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Department
                    </Text>
                    <Text
                      style={[
                        styles.detailInfoValue,
                        { color: theme.text },
                      ]}
                    >
                      {selectedCourse.department}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.detailInfoCard,
                      { backgroundColor: theme.cardBackground, borderColor: theme.border },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={theme.success}
                    />
                    <Text
                      style={[
                        styles.detailInfoLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Lecturer
                    </Text>
                    <Text
                      style={[
                        styles.detailInfoValue,
                        { color: theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedCourse.lecturer_name ||
                        getLecturerName(selectedCourse.lecturer_id)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailInfoRow}>
                  <View
                    style={[
                      styles.detailInfoCard,
                      { backgroundColor: theme.cardBackground, borderColor: theme.border },
                    ]}
                  >
                    <Ionicons
                      name="star-outline"
                      size={20}
                      color={theme.warning}
                    />
                    <Text
                      style={[
                        styles.detailInfoLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Credits
                    </Text>
                    <Text
                      style={[
                        styles.detailInfoValue,
                        { color: theme.text },
                      ]}
                    >
                      {selectedCourse.credits}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.detailInfoCard,
                      { backgroundColor: theme.cardBackground, borderColor: theme.border },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={theme.error}
                    />
                    <Text
                      style={[
                        styles.detailInfoLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Semester
                    </Text>
                    <Text
                      style={[
                        styles.detailInfoValue,
                        { color: theme.text },
                      ]}
                    >
                      {selectedCourse.semester} {selectedCourse.year}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              {selectedCourse.description ? (
                <View style={styles.detailSection}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: theme.text },
                    ]}
                  >
                    Description
                  </Text>
                  <Text
                    style={[
                      styles.detailDescription,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {selectedCourse.description}
                  </Text>
                </View>
              ) : null}

              {/* Dates */}
              <View style={styles.detailSection}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: theme.text },
                  ]}
                >
                  Course Info
                </Text>
                <View
                  style={[
                    styles.detailDateCard,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.detailDateRow}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.detailDateText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Created:{' '}
                      {new Date(
                        selectedCourse.created_at,
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  {selectedCourse.updated_at && (
                    <View
                      style={[styles.detailDateRow, { marginTop: 6 }]}
                    >
                      <Ionicons
                        name="refresh-outline"
                        size={16}
                        color={theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.detailDateText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Updated:{' '}
                        {new Date(
                          selectedCourse.updated_at,
                        ).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={[
                    styles.detailActionBtn,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() => {
                    setDetailModalVisible(false);
                    openEditModal(selectedCourse);
                  }}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.detailActionBtnText}>
                    Edit Course
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.detailActionBtn,
                    { backgroundColor: theme.error },
                  ]}
                  onPress={() => confirmDelete(selectedCourse)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.detailActionBtnText}>
                    Delete Course
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },

  // Department Chips
  deptScroll: {
    maxHeight: 40,
    marginBottom: 8,
  },
  deptScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deptChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  deptChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Search
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },

  // Sort
  sortScroll: {
    maxHeight: 36,
    marginBottom: 8,
  },
  sortScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Message
  messageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Course Card
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  creditBadge: {},
  creditText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 22,
  },
  cardDetails: {
    gap: 6,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  cardBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty & Loading
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Form
  formErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  formErrorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  formTextArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  formHint: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  formRow: {
    flexDirection: 'row',
  },

  // Picker Chips
  pickerScroll: {
    maxHeight: 44,
  },
  pickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  pickerChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Semester
  semesterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  semesterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  semesterBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Detail Modal
  detailHero: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  detailCodeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },
  detailCodeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  detailInfoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  detailInfoCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  detailInfoLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailInfoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailDateCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailDateText: {
    fontSize: 13,
  },
  detailActions: {
    gap: 12,
    marginTop: 8,
    marginBottom: 30,
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  detailActionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});