import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.heroSection}>
        {/* Decorative elements for premium visual feel */}
        <View style={[styles.glowBall, { backgroundColor: theme.primary, opacity: 0.15 }]} />
        
        <View style={styles.brandContainer}>
          <Text style={[styles.superTitle, { color: theme.primary }]}>IYA ABUBAKAR COMPUTER CENTER</Text>
          <Text style={[styles.mainTitle, { color: theme.text }]}>E-Learning Portal</Text>
          <View style={[styles.divider, { backgroundColor: theme.primary }]} />
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            A modern, robust learning management system designed to streamline online education, course material distribution, and academic assignments.
          </Text>
        </View>

        {/* Call to Actions */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.primaryButtonText}>Sign In to Portal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.primary }]}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Create an Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Portal Roles / Feature Cards Section */}
      <View style={[styles.featuresSection, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.sectionHeading, { color: theme.text }]}>Key Platform Roles</Text>
        <Text style={[styles.sectionSubheading, { color: theme.textSecondary }]}>
          Designed for all members of the academic ecosystem
        </Text>

        <View style={styles.cardContainer}>
          {/* Student Card */}
          <View style={[styles.featureCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
              <Text style={styles.featureIcon}>🎓</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Student Space</Text>
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
              Enroll in assigned courses, download course materials, submit assignments, track scores, and stay updated with official announcements.
            </Text>
          </View>

          {/* Lecturer Card */}
          <View style={[styles.featureCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.success + '15' }]}>
              <Text style={styles.featureIcon}>👩‍🏫</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Lecturer Console</Text>
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
              Manage virtual classrooms, publish lecture notes and reading materials, create assignments, grade student submissions, and broadcast announcements.
            </Text>
          </View>

          {/* Admin Card */}
          <View style={[styles.featureCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.warning + '15' }]}>
              <Text style={styles.featureIcon}>🛠️</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Admin Panel</Text>
            <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
              Oversee departments, manage student and lecturer profiles, audit platform activities, and configure system-wide configurations.
            </Text>
          </View>
        </View>
      </View>

      {/* Project Credits Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Developed by <Text style={[styles.boldText, { color: theme.text }]}>Group 10</Text>
        </Text>
        <Text style={[styles.subFooterText, { color: theme.textSecondary }]}>
          Final Year Project Group | Iya Abubakar Computer Center
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  glowBall: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -50,
    right: -50,
    transform: [{ scale: 1.5 }],
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  superTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 600,
  },
  actionContainer: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
    maxWidth: 320,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  featuresSection: {
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  sectionHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubheading: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
  cardContainer: {
    flexDirection: 'column',
    gap: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  featureCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 14,
  },
  boldText: {
    fontWeight: 'bold',
  },
  subFooterText: {
    fontSize: 12,
    textAlign: 'center',
  },
});