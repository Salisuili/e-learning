import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const profileFields = [
    { label: 'Name', value: user?.full_name, icon: 'person-outline' },
    { label: 'Email', value: user?.email, icon: 'mail-outline' },
    { label: 'Department', value: user?.department, icon: 'business-outline' },
    { label: 'Role', value: 'Student', icon: 'school-outline', highlight: true },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={[styles.headerGradient, { backgroundColor: theme.primary }]}>
        <Animated.View style={[styles.headerContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.avatarContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.avatarText}>{getInitials(user?.full_name || 'Student')}</Text>
          </View>
          <Text style={styles.userName}>{user?.full_name || 'Student'}</Text>
          <Text style={styles.userRole}>Student</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </Animated.View>
      </View>

      {/* Profile Info Card */}
      <View style={styles.profileSection}>
        <View style={[styles.infoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {profileFields.map((field, index) => (
            <View key={index}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIconContainer, { backgroundColor: field.highlight ? theme.primary + '15' : theme.backgroundElement }]}>
                  <Ionicons name={field.icon as any} size={20} color={field.highlight ? theme.primary : theme.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{field.label}</Text>
                  <Text style={[styles.infoValue, { color: field.highlight ? theme.primary : theme.text }]}>{field.value || 'Not set'}</Text>
                </View>
                {field.highlight && (
                  <View style={[styles.highlightBadge, { backgroundColor: theme.primary + '15' }]}>
                    <Text style={[styles.highlightBadgeText, { color: theme.primary }]}>Active</Text>
                  </View>
                )}
              </View>
              {index < profileFields.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            </View>
          ))}
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.error }]} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <Text style={[styles.versionText, { color: theme.textSecondary }]}>E-Learning App v1.0.0</Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingTop: 60, paddingBottom: 36, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerContent: { alignItems: 'center' },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 34, fontWeight: '700', color: '#fff' },
  userName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  userRole: { fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399' },
  statusText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  profileSection: { paddingHorizontal: 20, marginTop: 24 },
  infoCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  infoIconContainer: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: '700' },
  highlightBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  highlightBadgeText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, marginLeft: 72, opacity: 0.5 },
  logoutSection: { paddingHorizontal: 20, marginTop: 28 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  logoutText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  versionText: { textAlign: 'center', fontSize: 13, fontWeight: '500', marginTop: 20 },
});