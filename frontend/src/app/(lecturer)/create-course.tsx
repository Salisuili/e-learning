import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { courseService } from '@/services/courses';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const DEPARTMENTS = ['Computer Science', 'Computer Engineering', 'Cyber Security'];
const SEMESTERS = ['First', 'Second'];

export default function CreateCourseScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [credits, setCredits] = useState('3');
  const [semester, setSemester] = useState('First');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [level, setLevel] = useState('100');
  const [session, setSession] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);

  const LEVELS = ['100', '200', '300', '400', '500', '600', '700'];

  const validate = (): boolean => {
    if (!code.trim()) { setErrors('Course code is required'); return false; }
    if (!title.trim()) { setErrors('Course title is required'); return false; }
    if (!department) { setErrors('Please select a department'); return false; }
    const c = parseInt(credits, 10);
    if (isNaN(c) || c < 1 || c > 6) { setErrors('Credits must be between 1 and 6'); return false; }
    if (!semester) { setErrors('Please select a semester'); return false; }
    if (!year || isNaN(parseInt(year, 10))) { setErrors('Valid year is required'); return false; }
    if (!level) { setErrors('Please select a level'); return false; }
    return true;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    if (!user?.id) { Alert.alert('Error', 'You must be logged in'); return; }

    setSubmitting(true);
    setErrors(null);

    const { error } = await courseService.createCourse({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      department,
      lecturer_id: user.id,
      credits: parseInt(credits, 10),
      semester,
      year: parseInt(year, 10),
      level,
      session,
    });

    if (error) {
      setErrors(error);
    } else {
      Alert.alert('Success', 'Course created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Create New Course</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Set up a new course for your students
          </Text>
        </View>

        {/* Errors */}
        {errors && (
          <View style={[styles.errorBox, { backgroundColor: theme.error + '20', borderColor: theme.error + '40' }]}>
            <Ionicons name="alert-circle" size={18} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{errors}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Course Code */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Course Code *</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="e.g. CS101"
              placeholderTextColor={theme.textSecondary}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
          </View>

          {/* Course Title */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Course Title *</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="e.g. Introduction to Computer Science"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="Course description..."
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Department */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Department *</Text>
            <View style={styles.chipRow}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[styles.chip, {
                    backgroundColor: department === dept ? theme.primary + '20' : theme.backgroundElement,
                    borderColor: department === dept ? theme.primary : theme.border,
                  }]}
                  onPress={() => setDepartment(dept)}
                >
                  <Text style={[styles.chipText, { color: department === dept ? theme.primary : theme.textSecondary }]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Credits */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Credits *</Text>
            <View style={styles.chipRow}>
              {[1, 2, 3, 4, 5, 6].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, {
                    backgroundColor: credits === String(c) ? theme.primary + '20' : theme.backgroundElement,
                    borderColor: credits === String(c) ? theme.primary : theme.border,
                  }]}
                  onPress={() => setCredits(String(c))}
                >
                  <Text style={[styles.chipText, { color: credits === String(c) ? theme.primary : theme.textSecondary }]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Semester */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Semester *</Text>
            <View style={styles.chipRow}>
              {SEMESTERS.map((sem) => (
                <TouchableOpacity
                  key={sem}
                  style={[styles.chip, {
                    backgroundColor: semester === sem ? theme.primary + '20' : theme.backgroundElement,
                    borderColor: semester === sem ? theme.primary : theme.border,
                  }]}
                  onPress={() => setSemester(sem)}
                >
                  <Text style={[styles.chipText, { color: semester === sem ? theme.primary : theme.textSecondary }]}>
                    {sem}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Year */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Year *</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="e.g. 2026"
              placeholderTextColor={theme.textSecondary}
              value={year}
              onChangeText={setYear}
              keyboardType="numeric"
            />
          </View>

          {/* Level */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Level *</Text>
            <View style={styles.chipRow}>
              {LEVELS.map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.chip, {
                    backgroundColor: level === lvl ? theme.primary + '20' : theme.backgroundElement,
                    borderColor: level === lvl ? theme.primary : theme.border,
                  }]}
                  onPress={() => setLevel(lvl)}
                >
                  <Text style={[styles.chipText, { color: level === lvl ? theme.primary : theme.textSecondary }]}>
                    Level {lvl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Session */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Session</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
              placeholder="e.g. 2025/2026"
              placeholderTextColor={theme.textSecondary}
              value={session}
              onChangeText={setSession}
              autoCapitalize="none"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: submitting ? 0.6 : 1 }]}
            onPress={handleCreate}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitText}>Create Course</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backBtn: { marginBottom: 16, alignSelf: 'flex-start' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20, gap: 8 },
  errorText: { flex: 1, fontSize: 14 },
  form: { gap: 0 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, marginTop: 8, gap: 8 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});