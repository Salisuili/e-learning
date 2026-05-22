import { useTheme } from '@/hooks/use-theme';
import { StyleSheet, Text, View } from 'react-native';

export default function CreateCourseScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <Text style={[styles.title, { color: theme.text }]}>Create a new course</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>This page will let lecturers add their next class.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
});