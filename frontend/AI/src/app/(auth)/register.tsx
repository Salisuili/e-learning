import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [department, setDepartment] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [documentFile, setDocumentFile] = useState<{ name: string; uri: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const { register, submitting: loading, error } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setDocumentFile({ name: file.name, uri: file.uri });
      }
    } catch (err) {
      console.error('Document picker error:', err);
    }
  };

  const [registered, setRegistered] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !department) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!identificationNumber) {
      Alert.alert('Error', role === 'student'
        ? 'Please enter your registration/student number'
        : 'Please enter your staff/employee ID'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // First register the user
    await register(
      email,
      password,
      fullName,
      role,
      department,
      identificationNumber,
      undefined, // documentUrl will be set after upload
      undefined  // documentFileName will be set after upload
    );

    // Upload document if selected (after auth signup, so user session exists)
    let documentUrl: string | undefined;
    let documentFileName: string | undefined;

    if (documentFile) {
      setUploading(true);
      try {
        const fileExt = documentFile.name.split('.').pop() || 'pdf';
        const fileName = `${Date.now()}.${fileExt}`;
        const contentType = fileExt === 'pdf' ? 'application/pdf' : `image/${fileExt}`;

        const response = await fetch(documentFile.uri);
        const blob = await response.blob();

        // Upload to verification_docs bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('verification_docs')
          .upload(fileName, blob, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.warn('Storage upload failed:', uploadError.message);
          documentFileName = documentFile.name;
        } else if (uploadData) {
          const { data: urlData } = supabase.storage
            .from('verification_docs')
            .getPublicUrl(uploadData.path);
          documentUrl = urlData.publicUrl;
          documentFileName = documentFile.name;
          console.log('Document uploaded successfully:', documentUrl);

          // Update user profile with document info
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData?.session?.user?.id;
          if (userId) {
            await supabase
              .from('users')
              .update({
                document_url: documentUrl,
                document_file_name: documentFileName,
              })
              .eq('id', userId);
          }
        }
      } catch (err) {
        console.warn('Document upload failed:', err);
      }
      setUploading(false);
    }

    // Show success message and redirect to login
    if (!error) {
      setRegistered(true);
      Alert.alert(
        'Registration Successful!',
        'Your account has been created and is pending admin approval. You will be able to log in once an administrator approves your account.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ],
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Home</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Join the e-learning platform
            </Text>
            <Text style={[styles.approvalNote, { color: theme.warning }]}>
              Account requires admin approval before access
            </Text>
          </View>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: theme.error + '20', borderColor: theme.error + '40' }]}>
              <Ionicons name="alert-circle" size={18} color={theme.error} />
              <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
                placeholder="Enter your full name"
                placeholderTextColor={theme.textSecondary}
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
                placeholder="Enter your email"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Role */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>I am a *</Text>
              <View style={styles.roleRow}>
                {(['student', 'lecturer'] as const).map((roleOption) => {
                  const selected = roleOption === role;
                  const icon = roleOption === 'student' ? 'school-outline' : 'briefcase-outline';
                  return (
                    <TouchableOpacity
                      key={roleOption}
                      style={[
                        styles.roleButton,
                        selected
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      ]}
                      onPress={() => {
                        setRole(roleOption);
                        setIdentificationNumber('');
                      }}
                      disabled={loading}
                    >
                      <Ionicons
                        name={icon as any}
                        size={20}
                        color={selected ? '#ffffff' : theme.textSecondary}
                      />
                      <Text style={[styles.roleLabel, selected ? { color: '#ffffff' } : { color: theme.text }]}>
                        {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Department */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Department *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
                placeholder="Enter your department"
                placeholderTextColor={theme.textSecondary}
                value={department}
                onChangeText={setDepartment}
                editable={!loading}
              />
            </View>

            {/* Identification Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                {role === 'student' ? 'Registration Number *' : 'Staff/Employee ID *'}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
                placeholder={role === 'student' ? 'e.g. U21CS1001' : 'e.g. LEC/001'}
                placeholderTextColor={theme.textSecondary}
                value={identificationNumber}
                onChangeText={setIdentificationNumber}
                editable={!loading}
                autoCapitalize="characters"
              />
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                {role === 'student'
                  ? 'Enter your matriculation/registration number'
                  : 'Enter your staff ID for verification'}
              </Text>
            </View>

            {/* Document Upload */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>
                Verification Document
              </Text>
              {documentFile ? (
                <View style={[styles.uploadButton, { borderColor: theme.success + '60', backgroundColor: theme.success + '10' }]}>
                  <Ionicons name="document-text-outline" size={24} color={theme.success} />
                  <View style={styles.uploadTextContainer}>
                    <Text style={[styles.uploadTitle, { color: theme.text }]} numberOfLines={1}>
                      {documentFile.name}
                    </Text>
                    <Text style={[styles.uploadSubtitle, { color: theme.success }]}>
                      Document selected ✓
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDocumentFile(null)}>
                    <Ionicons name="close-circle" size={22} color={theme.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadButton, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}
                  onPress={pickDocument}
                  disabled={loading}
                >
                  <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
                  <View style={styles.uploadTextContainer}>
                    <Text style={[styles.uploadTitle, { color: theme.text }]}>
                      Tap to upload document
                    </Text>
                    <Text style={[styles.uploadSubtitle, { color: theme.textSecondary }]}>
                      {role === 'student'
                        ? 'Admission letter or Student ID (PDF/Image)'
                        : 'Staff ID or Appointment Letter (PDF/Image)'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Password *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
                placeholder="Enter a password"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                secureTextEntry
              />
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Confirm Password *</Text>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
                secureTextEntry
              />
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={handleRegister}
              disabled={loading || uploading}
            >
              {(loading || uploading) ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Register</Text>
              )}
            </TouchableOpacity>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
              <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                After registration, an admin will review your account. You'll receive access once approved.
              </Text>
            </View>
          </View>

          {!registered && (
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}> 
                Already have an account?{' '}
                <Text style={[styles.footerLink, { color: theme.primary }]} onPress={() => router.push('/(auth)/login')}>
                  Login here
                </Text>
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    minHeight: '100%',
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  approvalNote: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.1)',
    overflow: 'hidden',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 12,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontWeight: '600',
  },
});