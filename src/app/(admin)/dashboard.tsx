import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdminDashboard() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const stats = [
    { label: 'Total Users', value: '0', color: theme.primary },
    { label: 'Courses', value: '0', color: theme.success },
    { label: 'Departments', value: '0', color: theme.warning },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.padding}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: theme.text }]}>Admin Dashboard</Text>
          <Text style={[styles.subgreeting, { color: theme.textSecondary }]}>
            System Overview & Management
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            >
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/(admin)/users')}
        >
          <Text style={styles.actionButtonText}>Manage Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/(admin)/courses')}
        >
          <Text style={styles.actionButtonText}>Manage Courses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => {}}
        >
          <Text style={styles.actionButtonText}>View Reports</Text>
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
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subgreeting: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 0.31,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
