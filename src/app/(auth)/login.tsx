import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, submitting: loading, error } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }
    await login(email, password);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Home</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>E-Learning</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Mobile Learning Management System
          </Text>
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.error }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="Enter your email"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="Enter your password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={[styles.link, { color: theme.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Don't have an account?{' '}
            <Text
              style={[styles.footerLink, { color: theme.primary }]}
              onPress={() => router.push('/(auth)/register')}
            >
              Register here
            </Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start', // FIXED (removed space-between issue)
  },

  backButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },

  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },

  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },

  errorText: {
    color: '#fff',
    fontSize: 14,
  },

  form: {
    marginBottom: 30,
  },

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },

  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  link: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },

  footer: {
    alignItems: 'center',
    marginTop: 30,   // FIXED (instead of flex pushing)
    marginBottom: 20,
  },

  footerText: {
    fontSize: 14,
  },

  footerLink: {
    fontWeight: '600',
  },
});