import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.padding}>
        <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
        
        <View style={[styles.profileCard, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.profileRow}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
            <Text style={[styles.value, { color: theme.text }]}>{user?.full_name}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.profileRow}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
            <Text style={[styles.value, { color: theme.text }]}>{user?.email}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.profileRow}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Department</Text>
            <Text style={[styles.value, { color: theme.text }]}>{user?.department}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.profileRow}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Role</Text>
            <Text style={[styles.value, { color: theme.primary }]}>Admin</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.error }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padding: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  logoutButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
