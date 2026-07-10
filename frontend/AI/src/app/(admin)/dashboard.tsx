import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { courseService } from '@/services/courses';
import { userService } from '@/services/users';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalDepartments: number;
}

interface RecentActivity {
  action: string;
  time: string;
  icon: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalDepartments: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnimations = useRef(
    [0, 1, 2, 3].map(() => new Animated.Value(0))
  ).current;

  const loadDashboardData = useCallback(async () => {
    setLoading(true);

    const [usersRes, coursesRes] = await Promise.all([
      userService.getAllUsers(),
      courseService.getAllCourses(),
    ]);

    const users = usersRes.users || [];
    const courses = coursesRes.courses || [];
    const departments = new Set(courses.map((c) => c.department));

    setStats({
      totalUsers: users.length,
      totalCourses: courses.length,
      totalDepartments: departments.size,
    });

    // Build recent activities from real data
    const recent: RecentActivity[] = [];

    // Add latest users
    const sortedUsers = [...users].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    sortedUsers.slice(0, 2).forEach((u) => {
      const minutes = Math.floor(
        (Date.now() - new Date(u.created_at).getTime()) / 60000
      );
      const timeStr = minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)}h ago`;
      recent.push({
        action: `${u.full_name} registered as ${u.role}`,
        time: timeStr,
        icon: 'person-add-outline',
      });
    });

    // Add latest courses
    const sortedCourses = [...courses].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    sortedCourses.slice(0, 2).forEach((c) => {
      const minutes = Math.floor(
        (Date.now() - new Date(c.created_at).getTime()) / 60000
      );
      const timeStr = minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)}h ago`;
      recent.push({
        action: `Course "${c.title}" (${c.code}) created`,
        time: timeStr,
        icon: 'create-outline',
      });
    });

    setActivities(recent);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    cardAnimations.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 200 + i * 100,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  const statCards = [
    { label: 'Total Users', value: String(stats.totalUsers), icon: 'people-outline', color: '#6366F1', bgColor: '#6366F115' },
    { label: 'Courses', value: String(stats.totalCourses), icon: 'library-outline', color: '#10B981', bgColor: '#10B98115' },
    { label: 'Departments', value: String(stats.totalDepartments), icon: 'business-outline', color: '#F59E0B', bgColor: '#F59E0B15' },
    { label: 'Active Now', value: String(stats.totalUsers), icon: 'pulse-outline', color: '#EF4444', bgColor: '#EF444415' },
  ];

  const quickActions = [
    { label: 'Manage Users', icon: 'people-outline', route: '/(admin)/users' as const, color: '#6366F1' },
    { label: 'Manage Courses', icon: 'library-outline', route: '/(admin)/courses' as const, color: '#10B981' },
    { label: 'View Reports', icon: 'bar-chart-outline', route: undefined, color: '#F59E0B' },
    { label: 'Settings', icon: 'settings-outline', route: '/(admin)/profile' as const, color: '#8B5CF6' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Gradient Header */}
      <View style={[styles.headerGradient, { backgroundColor: theme.primary }]}>
        <View style={styles.headerOverlay} />
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.headerTextCol}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>
                {user?.full_name || 'Admin'}
              </Text>
            </View>
            <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.avatarText}>
                {(user?.full_name || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Here's what's happening with your platform today.
          </Text>

          {/* Mini Date Badge */}
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <Animated.View
            key={index}
            style={[
              styles.statCardWrapper,
              {
                opacity: cardAnimations[index],
                transform: [
                  {
                    translateY: cardAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                <Ionicons name={stat.icon as any} size={22} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{stat.label}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => action.route && router.push(action.route)}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.color + '15' }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: theme.text }]}>{action.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      {activities.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
          <View
            style={[
              styles.activityCard,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
            ]}
          >
            {activities.map((activity, index) => (
              <View
                key={index}
                style={[
                  styles.activityItem,
                  index < activities.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <View style={[styles.activityDot, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name={activity.icon as any} size={18} color={theme.primary} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityAction, { color: theme.text }]}>
                    {activity.action}
                  </Text>
                  <Text style={[styles.activityTime, { color: theme.textSecondary }]}>
                    {activity.time}
                  </Text>
                </View>
                <Ionicons name="ellipsis-horizontal" size={16} color={theme.textSecondary} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bottom spacing */}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    backgroundColor: '#000',
  },
  headerContent: {},
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTextCol: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    lineHeight: 20,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  statCardWrapper: {
    width: (width - 44) / 2,
  },
  statCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  statIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },
  actionsGrid: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  activityCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activityDot: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    fontWeight: '400',
  },
});