import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PendingApprovalScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const roleLabel = user?.role === 'lecturer' ? 'Lecturer' : 'Student';
  const statusMessage =
    user?.status === 'rejected'
      ? 'Your account has been rejected. Please contact support for more information.'
      : 'Your account is pending approval from an administrator. You will be notified once your account is approved.';
  const iconName = user?.status === 'rejected' ? 'close-circle-outline' : 'time-outline';
  const iconColor = user?.status === 'rejected' ? '#EF4444' : '#F59E0B';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={iconName as any} size={72} color={iconColor} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>
          {user?.status === 'rejected' ? 'Account Rejected' : 'Approval Pending'}
        </Text>

        {/* User Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color={theme.textSecondary} />
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Name</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{user?.full_name}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{user?.email}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={18} color={theme.textSecondary} />
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Department</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{user?.department}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.infoRow}>
            <Ionicons
              name={user?.role === 'lecturer' ? 'school-outline' : 'person-outline'}
              size={18}
              color={theme.textSecondary}
            />
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Role</Text>
              <Text style={[styles.infoValue, { color: theme.primary }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* Status Message */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: iconColor + '10',
              borderColor: iconColor + '30',
            },
          ]}
        >
          <Text style={[styles.statusText, { color: theme.text }]}>{statusMessage}</Text>
          {user?.rejection_reason && (
            <View style={styles.rejectionBox}>
              <Text style={[styles.rejectionLabel, { color: theme.textSecondary }]}>
                Reason:
              </Text>
              <Text style={[styles.rejectionText, { color: theme.error }]}>
                {user.rejection_reason}
              </Text>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.error }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Back to Login</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 24,
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    opacity: 0.5,
  },
  statusCard: {
    width: '100%',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 28,
  },
  statusText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  rejectionBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});